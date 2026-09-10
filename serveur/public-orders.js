// public-orders.js — Logique partagée pour le lien client public (sans
// compte), qu'il s'agisse d'une vente directe ou d'une facture classique.
// Un jeton donné n'existe que dans UNE seule des deux tables ; on cherche
// dans les deux plutôt que de dupliquer 3 routes par type de document.

const crypto = require('crypto');
const db = require('./db');
const paydunya = require('./paydunya');
const { nextNumber } = require('./numbering');

function computeTotals(items, discountPct, tvaRate) {
  const subtotal = items.reduce((s, it) => s + (Number(it.qty) || 0) * (Number(it.unit_price) || 0), 0);
  const afterDiscount = subtotal * (1 - (discountPct || 0) / 100);
  const tva = afterDiscount * ((tvaRate || 0) / 100);
  return { subtotal, discount: subtotal - afterDiscount, tva, total: afterDiscount + tva };
}

// Génère (ou renvoie) le jeton public pour un document (vente ou facture)
// déjà vérifié comme appartenant à l'entreprise appelante.
function ensureToken(table, record) {
  if (record.public_token) return record.public_token;
  const token = crypto.randomBytes(24).toString('base64url');
  db.prepare(`UPDATE ${table} SET public_token=? WHERE id=?`).run(token, record.id);
  return token;
}

// Même principe que ensureToken, mais pour le lien personnel du livreur —
// un jeton distinct de celui du client, pour ne jamais mélanger les deux
// accès (le livreur n'a pas besoin de voir le détail complet de la commande).
function ensureDriverToken(table, record) {
  if (record.driver_token) return record.driver_token;
  const token = crypto.randomBytes(24).toString('base64url');
  db.prepare(`UPDATE ${table} SET driver_token=? WHERE id=?`).run(token, record.id);
  return token;
}

function findByDriverToken(token) {
  const sale = db.prepare('SELECT * FROM sales WHERE driver_token = ? AND deleted = 0').get(token);
  if (sale) return { kind: 'sale', record: sale };
  const invoice = db.prepare('SELECT * FROM invoices WHERE driver_token = ? AND deleted = 0').get(token);
  if (invoice) return { kind: 'invoice', record: invoice };
  return null;
}

function findByToken(token) {
  const sale = db.prepare('SELECT * FROM sales WHERE public_token = ? AND deleted = 0').get(token);
  if (sale) return { kind: 'sale', record: sale };
  const invoice = db.prepare('SELECT * FROM invoices WHERE public_token = ? AND deleted = 0').get(token);
  if (invoice) return { kind: 'invoice', record: invoice };
  return null;
}

async function handlePublicGetOrder(req, res, { json, params }) {
  const found = findByToken(params.token);
  if (!found) return json(res, 404, { message: 'Commande introuvable ou lien expiré' });
  const { kind, record } = found;

  const company = db.prepare('SELECT name, logo, wave_payment_link, om_merchant_number FROM companies WHERE id = ?').get(record.company_id);
  const paydunyaAvailable = paydunya.isConfigured();

  if (kind === 'sale') {
    const items = db.prepare('SELECT description, qty, unit_price FROM sale_items WHERE sale_id = ?').all(record.id);
    const totals = computeTotals(items, 0, record.tva_rate);
    return json(res, 200, {
      number: record.number, date: record.date, items, ...totals,
      client_name: record.client_name, client_validated: !!record.client_validated,
      client_address: record.client_address || '', client_notes: record.client_notes || '',
      has_address_field: true,
      payment_status: record.payment_status, payment_reported: !!record.payment_reported,
      paydunya_available: paydunyaAvailable,
      delivery_status: record.delivery_status, client_confirmed_delivery: !!record.client_confirmed_delivery_at,
      company: { name: company.name, logo: company.logo, wave_payment_link: company.wave_payment_link, om_merchant_number: company.om_merchant_number }
    });
  }

  // kind === 'invoice'
  const items = db.prepare('SELECT description, qty, unit_price FROM invoice_items WHERE invoice_id = ? ORDER BY sort_order').all(record.id);
  const totals = computeTotals(items, record.discount_pct, record.tva_rate);
  json(res, 200, {
    number: record.number, date: record.date, items, ...totals,
    client_name: record.client_name_snapshot, client_validated: !!record.client_validated,
    client_address: '', client_notes: record.client_notes || '',
    has_address_field: false,
    payment_status: record.status === 'paye' ? 'payé' : (record.status === 'partiel' ? 'partiel' : 'impayé'),
    payment_reported: !!record.payment_reported,
    paydunya_available: paydunyaAvailable,
    delivery_status: record.delivery_status, client_confirmed_delivery: !!record.client_confirmed_delivery_at,
    company: { name: company.name, logo: company.logo, wave_payment_link: company.wave_payment_link, om_merchant_number: company.om_merchant_number }
  });
}

async function handlePublicValidate(req, res, { json, params, body }) {
  const found = findByToken(params.token);
  if (!found) return json(res, 404, { message: 'Commande introuvable ou lien expiré' });
  const table = found.kind === 'sale' ? 'sales' : 'invoices';

  // Le client peut compléter ce que le vendeur n'avait pas renseigné (adresse
  // pour une vente directe, précisions diverses) au moment où il valide.
  const notes = (body && typeof body.notes === 'string') ? body.notes.trim().slice(0, 500) : null;
  if (notes) db.prepare(`UPDATE ${table} SET client_notes=? WHERE id=?`).run(notes, found.record.id);
  if (table === 'sales' && body && typeof body.address === 'string' && body.address.trim()) {
    db.prepare(`UPDATE sales SET client_address=? WHERE id=?`).run(body.address.trim().slice(0, 300), found.record.id);
  }

  if (!found.record.client_validated) {
    db.prepare(`UPDATE ${table} SET client_validated=1, client_validated_at=?, updated_at=? WHERE id=?`)
      .run(Date.now(), Date.now(), found.record.id);
  }
  json(res, 200, { ok: true });
}

async function handlePublicReportPayment(req, res, { json, params }) {
  const found = findByToken(params.token);
  if (!found) return json(res, 404, { message: 'Commande introuvable ou lien expiré' });
  const table = found.kind === 'sale' ? 'sales' : 'invoices';
  db.prepare(`UPDATE ${table} SET payment_reported=1, payment_reported_at=?, updated_at=? WHERE id=?`)
    .run(Date.now(), Date.now(), found.record.id);
  json(res, 200, { ok: true });
}

function getItemsAndTotal(found) {
  const { kind, record } = found;
  if (kind === 'sale') {
    const items = db.prepare('SELECT description, qty, unit_price FROM sale_items WHERE sale_id = ?').all(record.id);
    return { items, ...computeTotals(items, 0, record.tva_rate) };
  }
  const items = db.prepare('SELECT description, qty, unit_price FROM invoice_items WHERE invoice_id = ? ORDER BY sort_order').all(record.id);
  return { items, ...computeTotals(items, record.discount_pct, record.tva_rate) };
}

// Montant qu'il reste réellement à payer, en tenant compte des acomptes déjà
// encaissés manuellement (ou lors d'un précédent essai) — on ne doit jamais
// faire payer au client le total complet une deuxième fois via PayDunya s'il
// a déjà réglé une partie de la commande autrement.
function getRemainingDue(found) {
  const { total } = getItemsAndTotal(found);
  const alreadyPaid = Number(found.record.amount_paid) || 0;
  return Math.max(0, total - alreadyPaid);
}

// Le client choisit lui-même son moyen de paiement (Wave, Orange Money,
// carte...) sur la page hébergée par PayDunya — rien de tout ça ne dépend
// des liens/numéros que le vendeur a configurés dans FAKTU.
async function handlePublicPaydunyaCheckout(req, res, { json, params }) {
  if (!paydunya.isConfigured()) return json(res, 503, { message: 'Paiement automatique non configuré' });
  const found = findByToken(params.token);
  if (!found) return json(res, 404, { message: 'Commande introuvable ou lien expiré' });

  const company = db.prepare('SELECT name FROM companies WHERE id = ?').get(found.record.company_id);
  const { items, total } = getItemsAndTotal(found);
  const amountDue = getRemainingDue(found);
  if (amountDue <= 0) return json(res, 400, { message: 'Cette commande est déjà payée' });
  // Si un acompte a déjà été réglé (hors PayDunya), on ne peut pas répartir
  // ce partiel sur les lignes d'origine : on envoie une ligne unique pour le
  // solde restant plutôt que de faire payer le total au client une seconde fois.
  const checkoutItems = amountDue < total
    ? [{ description: `Solde restant — commande ${found.record.number}`, qty: 1, unit_price: amountDue }]
    : items;
  const baseUrl = `https://${req.headers.host}`;

  try {
    const checkout = await paydunya.createCheckout({
      companyName: company.name,
      totalAmount: amountDue,
      description: `Commande ${found.record.number}`,
      items: checkoutItems,
      publicToken: params.token,
      ipnUrl: `${baseUrl}/api/paydunya/ipn`,
      returnUrl: `${baseUrl}/order/${params.token}`
    });
    const table = found.kind === 'sale' ? 'sales' : 'invoices';
    db.prepare(`UPDATE ${table} SET paydunya_token=? WHERE id=?`).run(checkout.token, found.record.id);
    json(res, 200, { url: checkout.url });
  } catch (e) {
    console.error('[PayDunya checkout]', e.message);
    json(res, 502, { message: e.message || 'Échec de connexion à PayDunya' });
  }
}

// Reçoit la confirmation automatique de PayDunya dès que le client a
// effectivement payé — c'est ce qui permet de marquer la commande payée
// sans que le vendeur ait quoi que ce soit à confirmer manuellement.
// Marque une commande comme payée dans notre base — utilisé aussi bien par
// l'IPN (passif) que par la vérification active (voir plus bas).
function markOrderPaid(found, amountJustPaid) {
  const table = found.kind === 'sale' ? 'sales' : 'invoices';
  const paymentField = table === 'sales' ? 'payment_status' : 'status';
  const { total } = getItemsAndTotal(found);
  const alreadyPaid = Number(found.record.amount_paid) || 0;
  // On ADDITIONNE au montant déjà encaissé (jamais un simple remplacement) :
  // le checkout PayDunya n'est créé que pour le solde restant (voir
  // getRemainingDue), donc ce paiement vient toujours compléter, jamais
  // remplacer, ce qui a déjà pu être réglé par un autre moyen.
  const amountPaid = Math.min(total, alreadyPaid + (Number(amountJustPaid) || 0));
  const isFullyPaid = amountPaid >= total;
  const paidValue = table === 'sales'
    ? (isFullyPaid ? 'payé' : 'partiel')
    : (isFullyPaid ? 'paye' : 'partiel');
  db.prepare(`UPDATE ${table} SET ${paymentField}=?, amount_paid=?, payment_method='PayDunya', payment_date=?, updated_at=? WHERE id=?`)
    .run(paidValue, amountPaid, new Date().toISOString().slice(0, 10), Date.now(), found.record.id);
}

// Le client revient sur cette page juste après avoir payé (ou annulé) sur
// PayDunya — on en profite pour vérifier nous-mêmes activement le statut
// réel du paiement auprès de PayDunya, plutôt que de dépendre uniquement
// d'une notification automatique qui peut être retardée ou ne jamais
// arriver selon la configuration réseau de l'hébergeur.
async function handlePublicCheckPayment(req, res, { json, params }) {
  const found = findByToken(params.token);
  if (!found) return json(res, 404, { message: 'Commande introuvable ou lien expiré' });

  if (found.record.payment_status === 'payé' || found.record.status === 'paye') {
    return json(res, 200, { paid: true });
  }
  if (!found.record.paydunya_token || !paydunya.isConfigured()) {
    return json(res, 200, { paid: false });
  }

  try {
    const data = await paydunya.confirmInvoice(found.record.paydunya_token);
    console.log('[PayDunya check] Réponse confirm:', JSON.stringify(data).slice(0, 500));

    const status = (data.status) || (data.invoice && data.invoice.status) || '';
    const amount = Number((data.invoice && data.invoice.total_amount) || 0);
    const isPaid = data.response_code === '00' && (status === 'completed' || status === 'paid' || status === 'complété');

    if (isPaid) {
      markOrderPaid(found, amount || getRemainingDue(found));
      return json(res, 200, { paid: true });
    }
    json(res, 200, { paid: false, status });
  } catch (e) {
    console.error('[PayDunya check] Erreur:', e.message);
    json(res, 200, { paid: false });
  }
}

async function handlePaydunyaIPN(req, res, { json, body }) {
  console.log('[PayDunya IPN] Requête reçue. Corps brut:', JSON.stringify(body).slice(0, 500));

  // PayDunya envoie un champ "data" (chaîne JSON) en x-www-form-urlencoded.
  let payload;
  try { payload = JSON.parse(body.data); } catch (e) {
    console.error('[PayDunya IPN] Corps invalide, impossible de parser "data":', e.message);
    return json(res, 400, { message: 'Corps invalide' });
  }

  console.log('[PayDunya IPN] status =', payload.status, '| custom_data =', JSON.stringify(payload.custom_data));

  if (!paydunya.verifyHash(payload.hash)) {
    console.error('[PayDunya IPN] Signature invalide — hash reçu ne correspond pas à la Master Key configurée.');
    return json(res, 403, { message: 'Signature invalide' });
  }
  if (payload.status !== 'completed') {
    console.log('[PayDunya IPN] Statut différent de "completed", ignoré:', payload.status);
    return json(res, 200, { ok: true });
  }

  const orderToken = payload.custom_data && payload.custom_data.order_token;
  const found = orderToken && findByToken(orderToken);
  if (!found) {
    console.error('[PayDunya IPN] Jeton de commande introuvable dans notre base:', orderToken);
    return json(res, 200, { ok: true });
  }

  const amount = Number(payload.invoice && payload.invoice.total_amount) || 0;
  markOrderPaid(found, amount || getRemainingDue(found));

  console.log('[PayDunya IPN] Commande marquée payée avec succès:', orderToken, '| montant:', amount);
  json(res, 200, { ok: true });
}

// ===== Boutique live : lien permanent (ex. /l/amine) où le client choisit
// lui-même un produit du catalogue et passe commande, sans que le vendeur
// n'ait à donner son numéro en direct. Réutilise ensuite tout le système de
// suivi/paiement/livraison déjà en place via le jeton public habituel. =====

async function handlePublicGetStore(req, res, { json, params }) {
  const company = db.prepare('SELECT id, name, logo, live_active FROM companies WHERE store_slug = ?').get(params.slug);
  if (!company) return json(res, 404, { message: 'Boutique introuvable' });
  const products = db.prepare('SELECT id, name, price, unit FROM products WHERE company_id = ? AND deleted = 0 ORDER BY name').all(company.id);
  json(res, 200, {
    company_name: company.name, company_logo: company.logo,
    live_active: !!company.live_active, products
  });
}

async function handlePublicCreateStoreOrder(req, res, { json, params, body }) {
  const company = db.prepare('SELECT * FROM companies WHERE store_slug = ?').get(params.slug);
  if (!company) return json(res, 404, { message: 'Boutique introuvable' });

  const product = db.prepare('SELECT * FROM products WHERE id = ? AND company_id = ? AND deleted = 0').get(body.product_id, company.id);
  if (!product) return json(res, 404, { message: 'Produit introuvable' });

  const qty = Math.max(1, Number(body.qty) || 1);
  if (product.stock < qty) return json(res, 400, { message: 'Stock insuffisant pour ce produit' });
  const clientName = (body.client_name || '').trim();
  const clientPhone = (body.client_phone || '').trim();
  const clientAddress = (body.client_address || '').trim();
  if (!clientName) return json(res, 400, { message: 'Le nom est requis' });
  if (!clientPhone) return json(res, 400, { message: 'Le téléphone est requis' });

  const id = crypto.randomUUID();
  const now = Date.now();
  const number = nextNumber(company.id, 'VTE');
  const deliveryStatus = clientAddress ? 'à faire' : 'retrait';
  // Le total n'est JAMAIS pris tel quel depuis le client : recalculé ici à
  // partir du prix réel du produit dans notre base.
  const publicToken = crypto.randomBytes(24).toString('base64url');

  db.exec('BEGIN');
  try {
    db.prepare(`INSERT INTO sales
      (id, company_id, number, date, client_name, client_phone, client_address, tva_rate,
       payment_status, amount_paid, delivery_status, public_token, client_validated, client_validated_at,
       deleted, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0, 'impayé', 0, ?, ?, 1, ?, 0, ?, ?)`)
      .run(id, company.id, number, new Date().toISOString().slice(0, 10),
        clientName, clientPhone, clientAddress || null, deliveryStatus, publicToken, now, now, now);

    db.prepare('INSERT INTO sale_items (id, sale_id, description, qty, unit_price, product_id) VALUES (?, ?, ?, ?, ?, ?)')
      .run(crypto.randomUUID(), id, product.name, qty, product.price, product.id);

    db.prepare('UPDATE products SET stock = stock - ?, updated_at = ? WHERE id = ?').run(qty, now, product.id);
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }

  json(res, 201, { token: publicToken });
}

// Une fois les deux confirmations réunies, on marque enfin livrée — jamais
// avant, même si l'une des deux parties a confirmé en premier.
function checkAndMarkDelivered(found) {
  const table = found.kind === 'sale' ? 'sales' : 'invoices';
  const r = db.prepare(`SELECT driver_confirmed_at, client_confirmed_delivery_at FROM ${table} WHERE id = ?`).get(found.record.id);
  if (r.driver_confirmed_at && r.client_confirmed_delivery_at) {
    db.prepare(`UPDATE ${table} SET delivery_status='livrée', updated_at=? WHERE id=?`).run(Date.now(), found.record.id);
    return true;
  }
  return false;
}

async function handlePublicGetDelivery(req, res, { json, params }) {
  const found = findByDriverToken(params.token);
  if (!found) return json(res, 404, { message: 'Livraison introuvable ou lien expiré' });
  const { kind, record } = found;
  const company = db.prepare('SELECT name FROM companies WHERE id = ?').get(record.company_id);
  json(res, 200, {
    number: record.number,
    company_name: company.name,
    client_name: kind === 'sale' ? record.client_name : record.client_name_snapshot,
    client_phone: kind === 'sale' ? record.client_phone : null,
    client_address: kind === 'sale' ? record.client_address : null,
    driver_confirmed: !!record.driver_confirmed_at,
    client_confirmed: !!record.client_confirmed_delivery_at,
    delivered: record.delivery_status === 'livrée'
  });
}

async function handleDriverConfirmDelivery(req, res, { json, params }) {
  const found = findByDriverToken(params.token);
  if (!found) return json(res, 404, { message: 'Livraison introuvable ou lien expiré' });
  const table = found.kind === 'sale' ? 'sales' : 'invoices';
  if (!found.record.driver_confirmed_at) {
    db.prepare(`UPDATE ${table} SET driver_confirmed_at=?, updated_at=? WHERE id=?`).run(Date.now(), Date.now(), found.record.id);
  }
  const delivered = checkAndMarkDelivered(found);
  json(res, 200, { ok: true, delivered });
}

async function handlePublicClientConfirmDelivery(req, res, { json, params }) {
  const found = findByToken(params.token);
  if (!found) return json(res, 404, { message: 'Commande introuvable ou lien expiré' });
  const table = found.kind === 'sale' ? 'sales' : 'invoices';
  if (!found.record.client_confirmed_delivery_at) {
    db.prepare(`UPDATE ${table} SET client_confirmed_delivery_at=?, updated_at=? WHERE id=?`).run(Date.now(), Date.now(), found.record.id);
  }
  const delivered = checkAndMarkDelivered(found);
  json(res, 200, { ok: true, delivered });
}

module.exports = {
  ensureToken, findByToken, ensureDriverToken, findByDriverToken, handlePublicGetOrder, handlePublicValidate,
  handlePublicReportPayment, handlePublicPaydunyaCheckout, handlePaydunyaIPN, handlePublicCheckPayment,
  handlePublicGetDelivery, handleDriverConfirmDelivery, handlePublicClientConfirmDelivery,
  handlePublicGetStore, handlePublicCreateStoreOrder
};

// public-orders.js — Logique partagée pour le lien client public (sans
// compte), qu'il s'agisse d'une vente directe ou d'une facture classique.
// Un jeton donné n'existe que dans UNE seule des deux tables ; on cherche
// dans les deux plutôt que de dupliquer 3 routes par type de document.

const crypto = require('crypto');
const db = require('./db');
const paydunya = require('./paydunya');

function computeTotals(items, discountPct, tvaRate) {
  const subtotal = items.reduce((s, it) => s + (Number(it.qty) || 0) * (Number(it.unit_price) || 0), 0);
  const afterDiscount = subtotal * (1 - (discountPct || 0) / 100);
  const tva = afterDiscount * ((tvaRate || 0) / 100);
  return { subtotal, discount: subtotal - afterDiscount, tva, total: afterDiscount + tva };
}

function ensureToken(table, record) {
  if (record.public_token) return record.public_token;
  const token = crypto.randomBytes(24).toString('base64url');
  db.prepare(`UPDATE ${table} SET public_token=? WHERE id=?`).run(token, record.id);
  return token;
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
      company: { name: company.name, logo: company.logo, wave_payment_link: company.wave_payment_link, om_merchant_number: company.om_merchant_number }
    });
  }

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
    company: { name: company.name, logo: company.logo, wave_payment_link: company.wave_payment_link, om_merchant_number: company.om_merchant_number }
  });
}

async function handlePublicValidate(req, res, { json, params, body }) {
  const found = findByToken(params.token);
  if (!found) return json(res, 404, { message: 'Commande introuvable ou lien expiré' });
  const table = found.kind === 'sale' ? 'sales' : 'invoices';

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

async function handlePublicPaydunyaCheckout(req, res, { json, params }) {
  if (!paydunya.isConfigured()) return json(res, 503, { message: 'Paiement automatique non configuré' });
  const found = findByToken(params.token);
  if (!found) return json(res, 404, { message: 'Commande introuvable ou lien expiré' });

  const company = db.prepare('SELECT name FROM companies WHERE id = ?').get(found.record.company_id);
  const { items, total } = getItemsAndTotal(found);
  const baseUrl = `https://${req.headers.host}`;

  try {
    const checkout = await paydunya.createCheckout({
      companyName: company.name,
      totalAmount: total,
      description: `Commande ${found.record.number}`,
      items,
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

function markOrderPaid(found, amount) {
  const table = found.kind === 'sale' ? 'sales' : 'invoices';
  const paymentField = table === 'sales' ? 'payment_status' : 'status';
  const paidValue = table === 'sales' ? 'payé' : 'paye';
  db.prepare(`UPDATE ${table} SET ${paymentField}=?, amount_paid=?, payment_method='PayDunya', payment_date=?, updated_at=? WHERE id=?`)
    .run(paidValue, amount, new Date().toISOString().slice(0, 10), Date.now(), found.record.id);
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
      markOrderPaid(found, amount || getItemsAndTotal(found).total);
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

  const table = found.kind === 'sale' ? 'sales' : 'invoices';
  const amount = Number(payload.invoice && payload.invoice.total_amount) || 0;
  markOrderPaid(found, amount);

  console.log('[PayDunya IPN] Commande marquée payée avec succès:', orderToken, '| montant:', amount);
  json(res, 200, { ok: true });
}

module.exports = {
  ensureToken, findByToken, handlePublicGetOrder, handlePublicValidate, handlePublicReportPayment,
  handlePublicPaydunyaCheckout, handlePaydunyaIPN, handlePublicCheckPayment
};

// sales.js — Vente Directe. Mêmes règles de sécurité que invoices.js : les
// totaux sont recalculés côté serveur, jamais reçus tels quels du frontend.

const crypto = require('crypto');
const db = require('./db');
const { getOrCreateCompany } = require('./companies');
const { nextNumber } = require('./numbering');
const { findOwnedDriver } = require('./drivers');
const { ensureToken, ensureDriverToken } = require('./public-orders');

function computeTotals(items, tvaRate) {
  const subtotal = items.reduce((s, it) => s + (Number(it.qty) || 0) * (Number(it.unit_price) || 0), 0);
  const tva = subtotal * ((tvaRate || 0) / 100);
  return { subtotal, tva, total: subtotal + tva };
}

function getSaleWithItems(id) {
  const sale = db.prepare('SELECT * FROM sales WHERE id = ?').get(id);
  if (!sale) return null;
  const items = db.prepare('SELECT * FROM sale_items WHERE sale_id = ?').all(id);
  return { ...sale, items, ...computeTotals(items, sale.tva_rate) };
}

function withTransaction(fn) {
  db.exec('BEGIN');
  try { const result = fn(); db.exec('COMMIT'); return result; }
  catch (e) { db.exec('ROLLBACK'); throw e; }
}

async function handleListSales(req, res, { json, user }) {
  const company = getOrCreateCompany(user.id);
  const rows = db.prepare('SELECT * FROM sales WHERE company_id = ? AND deleted = 0 ORDER BY created_at DESC').all(company.id);
  const withTotals = rows.map(s => {
    const items = db.prepare('SELECT * FROM sale_items WHERE sale_id = ?').all(s.id);
    return { ...s, ...computeTotals(items, s.tva_rate) };
  });
  json(res, 200, { sales: withTotals });
}

async function handleGetSale(req, res, { json, user, params }) {
  const company = getOrCreateCompany(user.id);
  const sale = getSaleWithItems(params.id);
  if (!sale || sale.company_id !== company.id) return json(res, 404, { message: 'Vente introuvable' });
  json(res, 200, { sale });
}

async function handleCreateSale(req, res, { json, user, body }) {
  const company = getOrCreateCompany(user.id);

  const items = Array.isArray(body.items) ? body.items.filter(it => (it.description || '').trim()) : [];
  if (items.length === 0) return json(res, 400, { message: 'Au moins un article est requis' });

  // Une ligne peut librement rester du texte libre (sans product_id) ; si
  // elle référence un produit du catalogue, on vérifie la quantité en stock
  // ici, avant transaction, pour la décrémenter au moment de l'insertion.
  const resolvedItems = [];
  for (const it of items) {
    if (Number(it.qty) <= 0) return json(res, 400, { message: 'Quantité invalide sur un article' });
    if (Number(it.unit_price) < 0) return json(res, 400, { message: 'Prix unitaire invalide sur un article' });
    let product = null;
    if (it.product_id) {
      product = db.prepare('SELECT * FROM products WHERE id = ? AND company_id = ? AND deleted = 0').get(it.product_id, company.id);
      if (!product) return json(res, 404, { message: 'Produit introuvable dans le catalogue' });
      if (product.stock < Number(it.qty)) {
        return json(res, 400, { message: `Stock insuffisant pour "${product.name}" (reste ${product.stock})` });
      }
    }
    resolvedItems.push({ ...it, product });
  }

  const clientPhone = (body.client_phone || '').trim();
  if (!clientPhone) return json(res, 400, { message: 'Le téléphone du client est requis' });

  const tvaRate = body.tva_rate != null ? Number(body.tva_rate) : (body.apply_tva ? company.tva_rate : 0);
  const id = crypto.randomUUID();
  const now = Date.now();
  const number = nextNumber(company.id, 'VTE');
  const deliveryStatus = (body.client_address || '').trim() ? 'à faire' : 'retrait';

  withTransaction(() => {
    db.prepare(`INSERT INTO sales
      (id, company_id, number, date, client_name, client_phone, client_address, tva_rate,
       payment_status, amount_paid, delivery_status, deleted, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'impayé', 0, ?, 0, ?, ?)`)
      .run(id, company.id, number, new Date().toISOString().slice(0, 10),
        (body.client_name || '').trim() || 'Client', clientPhone, (body.client_address || '').trim() || null,
        tvaRate, deliveryStatus, now, now);

    resolvedItems.forEach(it => {
      db.prepare('INSERT INTO sale_items (id, sale_id, description, qty, unit_price, product_id) VALUES (?, ?, ?, ?, ?, ?)')
        .run(crypto.randomUUID(), id, it.description.trim(), Number(it.qty), Number(it.unit_price) || 0, it.product ? it.product.id : null);
      if (it.product) {
        db.prepare('UPDATE products SET stock = stock - ?, updated_at = ? WHERE id = ?')
          .run(Number(it.qty), now, it.product.id);
      }
    });
  });

  json(res, 201, { sale: getSaleWithItems(id) });
}

function ownedSale(companyId, saleId) {
  return db.prepare('SELECT * FROM sales WHERE id = ? AND company_id = ?').get(saleId, companyId) || null;
}

async function handleRecordPayment(req, res, { json, user, body, params }) {
  const company = getOrCreateCompany(user.id);
  const sale = ownedSale(company.id, params.id);
  if (!sale) return json(res, 404, { message: 'Vente introuvable' });

  const amount = Number(body.amount);
  if (!amount || amount <= 0) return json(res, 400, { message: 'Montant invalide' });

  const items = db.prepare('SELECT * FROM sale_items WHERE sale_id = ?').all(sale.id);
  const { total } = computeTotals(items, sale.tva_rate);
  const remaining = total - sale.amount_paid;
  // Refuser plutôt que de plafonner silencieusement (voir invoices.js) :
  // un montant supérieur au solde dû est presque toujours une erreur de
  // saisie et ne doit pas être accepté sans le signaler.
  if (amount > remaining + 0.01) {
    return json(res, 400, { message: `Le montant dépasse le solde restant (${Math.round(remaining)} F)` });
  }
  const amountPaid = sale.amount_paid + amount;
  const paymentStatus = amountPaid >= total ? 'payé' : 'partiel';

  db.prepare('UPDATE sales SET amount_paid=?, payment_status=?, payment_method=?, payment_date=?, updated_at=? WHERE id=?')
    .run(amountPaid, paymentStatus, body.method || sale.payment_method,
      new Date().toISOString().slice(0, 10), Date.now(), sale.id);

  json(res, 200, { sale: getSaleWithItems(sale.id) });
}

async function handleAssignDriver(req, res, { json, user, body, params }) {
  const company = getOrCreateCompany(user.id);
  const sale = ownedSale(company.id, params.id);
  if (!sale) return json(res, 404, { message: 'Vente introuvable' });

  const driver = findOwnedDriver(company.id, body.driver_id);
  if (!driver) return json(res, 404, { message: 'Livreur introuvable' });

  db.prepare('UPDATE sales SET driver_id=?, delivery_status=?, updated_at=? WHERE id=?')
    .run(driver.id, 'assignée', Date.now(), sale.id);
  json(res, 200, { sale: getSaleWithItems(sale.id) });
}

async function handleMarkDelivered(req, res, { json, user, params }) {
  const company = getOrCreateCompany(user.id);
  const sale = ownedSale(company.id, params.id);
  if (!sale) return json(res, 404, { message: 'Vente introuvable' });
  db.prepare('UPDATE sales SET delivery_status=?, updated_at=? WHERE id=?').run('livrée', Date.now(), sale.id);
  json(res, 200, { sale: getSaleWithItems(sale.id) });
}

async function handleDeleteSale(req, res, { json, user, params }) {
  const company = getOrCreateCompany(user.id);
  const sale = ownedSale(company.id, params.id);
  if (!sale) return json(res, 404, { message: 'Vente introuvable' });
  withTransaction(() => {
    // On restitue le stock des lignes liées à un produit du catalogue :
    // une vente supprimée ne doit pas laisser le stock décrémenté pour rien.
    const linkedItems = db.prepare('SELECT product_id, qty FROM sale_items WHERE sale_id = ? AND product_id IS NOT NULL').all(sale.id);
    const now = Date.now();
    for (const it of linkedItems) {
      db.prepare('UPDATE products SET stock = stock + ?, updated_at = ? WHERE id = ?').run(it.qty, now, it.product_id);
    }
    db.prepare('UPDATE sales SET deleted=1, deleted_at=? WHERE id=?').run(now, sale.id);
  });
  json(res, 200, { ok: true });
}

// ---- Lien client (public, sans compte) ----

async function handleGenerateLink(req, res, { json, user, params }) {
  const company = getOrCreateCompany(user.id);
  const sale = ownedSale(company.id, params.id);
  if (!sale) return json(res, 404, { message: 'Vente introuvable' });
  json(res, 200, { token: ensureToken('sales', sale) });
}

async function handleGenerateDriverLink(req, res, { json, user, params }) {
  const company = getOrCreateCompany(user.id);
  const sale = ownedSale(company.id, params.id);
  if (!sale) return json(res, 404, { message: 'Vente introuvable' });
  json(res, 200, { token: ensureDriverToken('sales', sale) });
}

module.exports = {
  handleListSales, handleGetSale, handleCreateSale, handleRecordPayment,
  handleAssignDriver, handleMarkDelivered, handleDeleteSale,
  handleGenerateLink, handleGenerateDriverLink
};

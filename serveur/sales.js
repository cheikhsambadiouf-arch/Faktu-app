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

// Logique de création réutilisée par la route HTTP normale ET par
// l'assistant (assistant.js) — un seul chemin de vérité, jamais dupliqué.
// Lance une erreur avec .status si la requête est invalide, plutôt que
// d'écrire directement une réponse HTTP (l'appelant décide comment réagir).
function createSaleForCompany(company, payload) {
  const items = Array.isArray(payload.items) ? payload.items.filter(it => (it.description || '').trim()) : [];
  if (items.length === 0) { const e = new Error('Au moins un article est requis'); e.status = 400; throw e; }
  for (const it of items) {
    if (Number(it.qty) <= 0) { const e = new Error('Quantité invalide sur un article'); e.status = 400; throw e; }
    if (Number(it.unit_price) < 0) { const e = new Error('Prix unitaire invalide sur un article'); e.status = 400; throw e; }
  }

  const clientPhone = (payload.client_phone || '').trim();
  if (!clientPhone) { const e = new Error('Le téléphone du client est requis'); e.status = 400; throw e; }

  const tvaRate = payload.tva_rate != null ? Number(payload.tva_rate) : (payload.apply_tva ? company.tva_rate : 0);
  const id = crypto.randomUUID();
  const now = Date.now();
  const number = nextNumber(company.id, 'VTE');
  const deliveryStatus = (payload.client_address || '').trim() ? 'à faire' : 'retrait';

  withTransaction(() => {
    db.prepare(`INSERT INTO sales
      (id, company_id, number, date, client_name, client_phone, client_address, tva_rate,
       payment_status, amount_paid, delivery_status, deleted, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'impayé', 0, ?, 0, ?, ?)`)
      .run(id, company.id, number, new Date().toISOString().slice(0, 10),
        (payload.client_name || '').trim() || 'Client', clientPhone, (payload.client_address || '').trim() || null,
        tvaRate, deliveryStatus, now, now);

    items.forEach(it => {
      db.prepare('INSERT INTO sale_items (id, sale_id, description, qty, unit_price) VALUES (?, ?, ?, ?, ?)')
        .run(crypto.randomUUID(), id, it.description.trim(), Number(it.qty), Number(it.unit_price) || 0);
    });
  });

  return getSaleWithItems(id);
}

async function handleCreateSale(req, res, { json, user, body }) {
  const company = getOrCreateCompany(user.id);
  try {
    const sale = createSaleForCompany(company, body);
    json(res, 201, { sale });
  } catch (e) {
    json(res, e.status || 500, { message: e.message || 'Erreur serveur' });
  }
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
  const amountPaid = Math.min(total, sale.amount_paid + amount);
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
  db.prepare('UPDATE sales SET deleted=1, deleted_at=? WHERE id=?').run(Date.now(), sale.id);
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

// ---- Demandes issues d'un live : le vendeur accepte ou refuse avant que
// quoi que ce soit ne parte en paiement ou en livraison. ----
async function handleAcceptRequest(req, res, { json, user, params }) {
  const company = getOrCreateCompany(user.id);
  const sale = ownedSale(company.id, params.id);
  if (!sale) return json(res, 404, { message: 'Vente introuvable' });
  db.prepare(`UPDATE sales SET request_status='accepted', updated_at=? WHERE id=?`).run(Date.now(), sale.id);
  json(res, 200, { sale: getSaleWithItems(sale.id) });
}
async function handleRefuseRequest(req, res, { json, user, body, params }) {
  const company = getOrCreateCompany(user.id);
  const sale = ownedSale(company.id, params.id);
  if (!sale) return json(res, 404, { message: 'Vente introuvable' });
  const reason = (body.reason || 'Autre').trim().slice(0, 200);
  db.prepare(`UPDATE sales SET request_status='refused', request_refuse_reason=?, updated_at=? WHERE id=?`)
    .run(reason, Date.now(), sale.id);
  json(res, 200, { sale: getSaleWithItems(sale.id) });
}

module.exports = {
  handleListSales, handleGetSale, handleCreateSale, handleRecordPayment,
  handleAssignDriver, handleMarkDelivered, handleDeleteSale,
  handleGenerateLink, handleGenerateDriverLink,
  handleAcceptRequest, handleRefuseRequest,
  createSaleForCompany
};

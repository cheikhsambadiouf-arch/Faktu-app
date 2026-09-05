// invoices.js — Factures / proformas / bons de commande / bons de livraison.
// RÈGLE DE SÉCURITÉ : les totaux sont TOUJOURS recalculés côté serveur à
// partir des lignes d'articles. Le frontend peut envoyer ce qu'il veut comme
// "total", ce champ est ignoré — jamais utilisé comme source de vérité.

const crypto = require('crypto');
const db = require('./db');
const { getOrCreateCompany } = require('./companies');
const { nextNumber } = require('./numbering');
const { findOwnedDriver } = require('./drivers');
const { ensureToken } = require('./public-orders');

const VALID_TYPES = ['FAC', 'PRO', 'BC', 'BL'];

function computeTotals(items, discountPct, tvaRate) {
  const subtotal = items.reduce((s, it) => s + (Number(it.qty) || 0) * (Number(it.unit_price) || 0), 0);
  const afterDiscount = subtotal * (1 - (discountPct || 0) / 100);
  const tva = afterDiscount * ((tvaRate || 0) / 100);
  return { subtotal, discount: subtotal - afterDiscount, tva, total: afterDiscount + tva };
}

function getInvoiceWithItems(id) {
  const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(id);
  if (!invoice) return null;
  const items = db.prepare('SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY sort_order').all(id);
  const totals = computeTotals(items, invoice.discount_pct, invoice.tva_rate);
  return { ...invoice, items, ...totals };
}

function withTransaction(fn) {
  db.exec('BEGIN');
  try { const result = fn(); db.exec('COMMIT'); return result; }
  catch (e) { db.exec('ROLLBACK'); throw e; }
}

async function handleListInvoices(req, res, { json, user }) {
  const company = getOrCreateCompany(user.id);
  const rows = db.prepare('SELECT * FROM invoices WHERE company_id = ? AND deleted = 0 ORDER BY created_at DESC')
    .all(company.id);
  const withTotals = rows.map(inv => {
    const items = db.prepare('SELECT * FROM invoice_items WHERE invoice_id = ?').all(inv.id);
    return { ...inv, ...computeTotals(items, inv.discount_pct, inv.tva_rate) };
  });
  json(res, 200, { invoices: withTotals });
}

async function handleGetInvoice(req, res, { json, user, params }) {
  const company = getOrCreateCompany(user.id);
  const invoice = getInvoiceWithItems(params.id);
  if (!invoice || invoice.company_id !== company.id) return json(res, 404, { message: 'Facture introuvable' });
  json(res, 200, { invoice });
}

async function handleCreateInvoice(req, res, { json, user, body }) {
  const company = getOrCreateCompany(user.id);

  const type = VALID_TYPES.includes(body.type) ? body.type : 'FAC';
  const items = Array.isArray(body.items) ? body.items.filter(it => (it.description || '').trim()) : [];
  if (items.length === 0) return json(res, 400, { message: 'Au moins un article est requis' });
  for (const it of items) {
    if (Number(it.qty) <= 0) return json(res, 400, { message: 'Quantité invalide sur un article' });
    if (Number(it.unit_price) < 0) return json(res, 400, { message: 'Prix unitaire invalide sur un article' });
  }

  let clientNameSnapshot = (body.client_name || '').trim();
  let clientId = null;
  if (body.client_id) {
    // Le client doit appartenir à l'entreprise appelante — jamais faire
    // confiance à un id de client fourni par le frontend sans vérification.
    const client = db.prepare('SELECT * FROM clients WHERE id = ? AND company_id = ?').get(body.client_id, company.id);
    if (!client) return json(res, 404, { message: 'Client introuvable' });
    clientId = client.id;
    clientNameSnapshot = client.name;
  }
  if (!clientNameSnapshot) return json(res, 400, { message: 'Le nom du client est requis' });

  const discountPct = Math.min(100, Math.max(0, Number(body.discount_pct) || 0));
  const tvaRate = body.tva_rate != null ? Number(body.tva_rate) : company.tva_rate;

  const id = crypto.randomUUID();
  const now = Date.now();
  const number = nextNumber(company.id, type);

  withTransaction(() => {
    db.prepare(`INSERT INTO invoices
      (id, company_id, client_id, client_name_snapshot, type, number, date, due_date, subject,
       discount_pct, tva_rate, status, amount_paid, deleted, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'brouillon', 0, 0, ?, ?)`)
      .run(id, company.id, clientId, clientNameSnapshot, type, number,
        body.date || new Date().toISOString().slice(0, 10), body.due_date || null, body.subject || null,
        discountPct, tvaRate, now, now);

    items.forEach((it, i) => {
      db.prepare(`INSERT INTO invoice_items (id, invoice_id, description, qty, unit_price, sort_order)
                  VALUES (?, ?, ?, ?, ?, ?)`)
        .run(crypto.randomUUID(), id, it.description.trim(), Number(it.qty), Number(it.unit_price) || 0, i);
    });
  });

  json(res, 201, { invoice: getInvoiceWithItems(id) });
}

function ownedInvoice(companyId, invoiceId) {
  const invoice = db.prepare('SELECT * FROM invoices WHERE id = ? AND company_id = ?').get(invoiceId, companyId);
  return invoice || null;
}

async function handleRecordPayment(req, res, { json, user, body, params }) {
  const company = getOrCreateCompany(user.id);
  const invoice = ownedInvoice(company.id, params.id);
  if (!invoice) return json(res, 404, { message: 'Facture introuvable' });

  const amount = Number(body.amount);
  if (!amount || amount <= 0) return json(res, 400, { message: 'Montant invalide' });

  const items = db.prepare('SELECT * FROM invoice_items WHERE invoice_id = ?').all(invoice.id);
  const { total } = computeTotals(items, invoice.discount_pct, invoice.tva_rate);
  const amountPaid = Math.min(total, invoice.amount_paid + amount);
  const status = amountPaid >= total ? 'paye' : 'partiel';

  db.prepare(`UPDATE invoices SET amount_paid=?, status=?, payment_method=?, payment_ref=?, payment_date=?, updated_at=? WHERE id=?`)
    .run(amountPaid, status, body.method || invoice.payment_method, body.ref || null,
      new Date().toISOString().slice(0, 10), Date.now(), invoice.id);

  json(res, 200, { invoice: getInvoiceWithItems(invoice.id) });
}

async function handleAssignDriver(req, res, { json, user, body, params }) {
  const company = getOrCreateCompany(user.id);
  const invoice = ownedInvoice(company.id, params.id);
  if (!invoice) return json(res, 404, { message: 'Facture introuvable' });

  const driver = findOwnedDriver(company.id, body.driver_id);
  if (!driver) return json(res, 404, { message: 'Livreur introuvable' });

  db.prepare('UPDATE invoices SET driver_id=?, delivery_status=?, updated_at=? WHERE id=?')
    .run(driver.id, 'assignée', Date.now(), invoice.id);
  json(res, 200, { invoice: getInvoiceWithItems(invoice.id) });
}

async function handleMarkDelivered(req, res, { json, user, params }) {
  const company = getOrCreateCompany(user.id);
  const invoice = ownedInvoice(company.id, params.id);
  if (!invoice) return json(res, 404, { message: 'Facture introuvable' });
  db.prepare('UPDATE invoices SET delivery_status=?, updated_at=? WHERE id=?').run('livrée', Date.now(), invoice.id);
  json(res, 200, { invoice: getInvoiceWithItems(invoice.id) });
}

async function handleDeleteInvoice(req, res, { json, user, params }) {
  const company = getOrCreateCompany(user.id);
  const invoice = ownedInvoice(company.id, params.id);
  if (!invoice) return json(res, 404, { message: 'Facture introuvable' });
  db.prepare('UPDATE invoices SET deleted=1, deleted_at=? WHERE id=?').run(Date.now(), invoice.id);
  json(res, 200, { ok: true });
}

async function handleGenerateLink(req, res, { json, user, params }) {
  const company = getOrCreateCompany(user.id);
  const invoice = ownedInvoice(company.id, params.id);
  if (!invoice) return json(res, 404, { message: 'Facture introuvable' });
  json(res, 200, { token: ensureToken('invoices', invoice) });
}

module.exports = {
  handleListInvoices, handleGetInvoice, handleCreateInvoice, handleRecordPayment,
  handleAssignDriver, handleMarkDelivered, handleDeleteInvoice, handleGenerateLink
};

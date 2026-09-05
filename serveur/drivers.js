// drivers.js — Gestion des livreurs (contacts externes, jamais de compte FAKTU).

const crypto = require('crypto');
const db = require('./db');
const { getOrCreateCompany } = require('./companies');

async function handleListDrivers(req, res, { json, user }) {
  const company = getOrCreateCompany(user.id);
  const rows = db.prepare('SELECT * FROM drivers WHERE company_id = ? AND deleted = 0 ORDER BY name COLLATE NOCASE')
    .all(company.id);
  json(res, 200, { drivers: rows });
}

async function handleCreateDriver(req, res, { json, user, body }) {
  const company = getOrCreateCompany(user.id);
  const name = (body.name || '').trim();
  if (!name) return json(res, 400, { message: 'Le nom du livreur est requis' });

  const id = crypto.randomUUID();
  db.prepare('INSERT INTO drivers (id, company_id, name, phone, deleted, created_at) VALUES (?, ?, ?, ?, 0, ?)')
    .run(id, company.id, name, (body.phone || '').trim() || null, Date.now());

  json(res, 201, { driver: db.prepare('SELECT * FROM drivers WHERE id = ?').get(id) });
}

async function handleDeleteDriver(req, res, { json, user, params }) {
  const company = getOrCreateCompany(user.id);
  const existing = db.prepare('SELECT * FROM drivers WHERE id = ? AND company_id = ?').get(params.id, company.id);
  if (!existing) return json(res, 404, { message: 'Livreur introuvable' });
  db.prepare('UPDATE drivers SET deleted = 1 WHERE id = ?').run(existing.id);
  json(res, 200, { ok: true });
}

function findOwnedDriver(companyId, driverId) {
  return db.prepare('SELECT * FROM drivers WHERE id = ? AND company_id = ? AND deleted = 0').get(driverId, companyId);
}

module.exports = { handleListDrivers, handleCreateDriver, handleDeleteDriver, findOwnedDriver };

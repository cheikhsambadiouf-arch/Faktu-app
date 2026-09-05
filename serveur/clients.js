// clients.js — CRUD clients, strictement cantonné à l'entreprise de
// l'utilisateur authentifié. Suppression douce (corbeille), comme côté app.

const crypto = require('crypto');
const db = require('./db');
const { getOrCreateCompany } = require('./companies');

async function handleListClients(req, res, { json, user }) {
  const company = getOrCreateCompany(user.id);
  const rows = db.prepare('SELECT * FROM clients WHERE company_id = ? AND deleted = 0 ORDER BY name COLLATE NOCASE')
    .all(company.id);
  json(res, 200, { clients: rows });
}

async function handleCreateClient(req, res, { json, user, body }) {
  const company = getOrCreateCompany(user.id);
  const name = (body.name || '').trim();
  if (!name) return json(res, 400, { message: 'Le nom du client est requis' });

  const id = crypto.randomUUID();
  const now = Date.now();
  db.prepare(`INSERT INTO clients (id, company_id, name, phone, address, deleted, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, 0, ?, ?)`)
    .run(id, company.id, name, (body.phone || '').trim() || null, (body.address || '').trim() || null, now, now);

  const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(id);
  json(res, 201, { client });
}

function findOwnedClient(companyId, clientId) {
  return db.prepare('SELECT * FROM clients WHERE id = ? AND company_id = ?').get(clientId, companyId);
}

async function handleUpdateClient(req, res, { json, user, body, params }) {
  const company = getOrCreateCompany(user.id);
  const existing = findOwnedClient(company.id, params.id);
  // 404 (et non 403) pour ne pas révéler qu'un client avec cet id existe
  // ailleurs, chez une autre entreprise.
  if (!existing) return json(res, 404, { message: 'Client introuvable' });

  const name = body.name != null ? body.name.trim() : existing.name;
  if (!name) return json(res, 400, { message: 'Le nom du client est requis' });

  db.prepare(`UPDATE clients SET name = ?, phone = ?, address = ?, updated_at = ? WHERE id = ?`)
    .run(name,
      body.phone != null ? body.phone.trim() || null : existing.phone,
      body.address != null ? body.address.trim() || null : existing.address,
      Date.now(), existing.id);

  const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(existing.id);
  json(res, 200, { client });
}

async function handleDeleteClient(req, res, { json, user, params }) {
  const company = getOrCreateCompany(user.id);
  const existing = findOwnedClient(company.id, params.id);
  if (!existing) return json(res, 404, { message: 'Client introuvable' });

  db.prepare('UPDATE clients SET deleted = 1, deleted_at = ? WHERE id = ?').run(Date.now(), existing.id);
  json(res, 200, { ok: true });
}

module.exports = { handleListClients, handleCreateClient, handleUpdateClient, handleDeleteClient };

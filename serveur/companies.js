// companies.js — Une entreprise par utilisateur (créée automatiquement au
// premier accès), avec tous les champs déjà présents côté app FAKTU.

const crypto = require('crypto');
const db = require('./db');

const COMPANY_FIELDS = [
  'name', 'legal_name', 'phone', 'whatsapp', 'email', 'address', 'city',
  'country', 'ninea', 'logo', 'signature', 'cachet',
  'tva_rate', 'currency_name', 'theme_primary', 'theme_accent',
  'wave_payment_link', 'om_merchant_number'
];

function getOrCreateCompany(userId) {
  let company = db.prepare('SELECT * FROM companies WHERE user_id = ?').get(userId);
  if (!company) {
    const id = crypto.randomUUID();
    const now = Date.now();
    db.prepare(`INSERT INTO companies (id, user_id, tva_rate, currency_name, created_at)
                VALUES (?, ?, 18, 'francs CFA', ?)`).run(id, userId, now);
    company = db.prepare('SELECT * FROM companies WHERE id = ?').get(id);
  }
  return company;
}

async function handleGetCompany(req, res, { json, user }) {
  const company = getOrCreateCompany(user.id);
  json(res, 200, { company });
}

async function handleUpdateCompany(req, res, { json, user, body }) {
  const company = getOrCreateCompany(user.id);

  const updates = [];
  const values = [];
  for (const field of COMPANY_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(body, field)) {
      updates.push(`${field} = ?`);
      values.push(body[field]);
    }
  }
  if (updates.length === 0) return json(res, 400, { message: 'Aucun champ à mettre à jour' });

  if (body.tva_rate != null && (isNaN(body.tva_rate) || body.tva_rate < 0 || body.tva_rate > 100)) {
    return json(res, 400, { message: 'Taux de TVA invalide' });
  }

  values.push(company.id);
  db.prepare(`UPDATE companies SET ${updates.join(', ')} WHERE id = ?`).run(...values);

  const updated = db.prepare('SELECT * FROM companies WHERE id = ?').get(company.id);
  json(res, 200, { company: updated });
}

module.exports = { getOrCreateCompany, handleGetCompany, handleUpdateCompany };

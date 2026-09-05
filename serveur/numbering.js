// numbering.js — Numérotation atomique par entreprise, sans doublon possible
// même en cas de requêtes concurrentes (utilise RETURNING pour lire la
// nouvelle valeur dans la même opération que l'incrémentation).

const db = require('./db');

const PREFIXES = { FAC: 'F', PRO: 'PF', BC: 'BC', BL: 'BL', VTE: 'VTE' };

function nextNumber(companyId, type) {
  const row = db.prepare(`
    INSERT INTO counters (company_id, type, value) VALUES (?, ?, 1)
    ON CONFLICT(company_id, type) DO UPDATE SET value = value + 1
    RETURNING value
  `).get(companyId, type);

  const year = new Date().getFullYear();
  const prefix = PREFIXES[type] || type;
  return `${prefix}-${year}-${String(row.value).padStart(4, '0')}`;
}

module.exports = { nextNumber };

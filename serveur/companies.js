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

// Transforme un nom d'entreprise en identifiant de lien lisible : minuscules,
// sans accents, sans caractères spéciaux — ex. "Amine Shop" -> "amine-shop".
function slugify(text) {
  return (text || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'boutique';
}

// Garantit un identifiant unique : si "amine" est déjà pris par une autre
// entreprise, essaie "amine-2", "amine-3", etc.
function ensureUniqueSlug(base, excludeCompanyId) {
  let slug = slugify(base);
  let n = 2;
  while (true) {
    const existing = db.prepare('SELECT id FROM companies WHERE store_slug = ? AND id != ?').get(slug, excludeCompanyId || '');
    if (!existing) return slug;
    slug = `${slugify(base)}-${n}`;
    n++;
  }
}

async function handleSetStoreSlug(req, res, { json, user, body }) {
  const company = getOrCreateCompany(user.id);
  const requested = (body.slug || '').trim();
  if (!requested) return json(res, 400, { message: 'Lien vide' });
  const clean = slugify(requested);
  const taken = db.prepare('SELECT id FROM companies WHERE store_slug = ? AND id != ?').get(clean, company.id);
  if (taken) return json(res, 409, { message: 'Ce lien est déjà utilisé, choisissez-en un autre' });
  db.prepare('UPDATE companies SET store_slug = ? WHERE id = ?').run(clean, company.id);
  json(res, 200, { store_slug: clean });
}

async function handleToggleLive(req, res, { json, user, body }) {
  const company = getOrCreateCompany(user.id);
  const active = !!body.active;
  let slug = company.store_slug;
  if (active && !slug) {
    // Premier démarrage d'un live : on génère un lien automatiquement à
    // partir du nom de l'entreprise, le vendeur pourra le personnaliser.
    slug = ensureUniqueSlug(company.name || 'boutique', company.id);
    db.prepare('UPDATE companies SET store_slug = ?, live_active = ? WHERE id = ?').run(slug, active ? 1 : 0, company.id);
  } else {
    db.prepare('UPDATE companies SET live_active = ? WHERE id = ?').run(active ? 1 : 0, company.id);
  }
  json(res, 200, { live_active: active, store_slug: slug });
}

module.exports = { getOrCreateCompany, handleGetCompany, handleUpdateCompany, handleSetStoreSlug, handleToggleLive };

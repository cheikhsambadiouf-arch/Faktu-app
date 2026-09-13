// admin.js — Tableau de bord administrateur. Complètement séparé des
// comptes utilisateurs : un seul mot de passe (variable d'environnement
// ADMIN_PASSWORD), jamais stocké en base, jamais visible depuis l'app
// vendeur. Si la variable n'est pas définie, l'accès admin est refusé par
// défaut (échec fermé) plutôt que d'accepter un mot de passe par défaut.

const crypto = require('crypto');
const db = require('./db');
const { hashPassword, signToken } = require('./auth-utils');

const TRIAL_DAYS = 3;

function computeSubscriptionStatus(user) {
  if (user.subscription_status === 'active' && user.subscription_expires_at && user.subscription_expires_at > Date.now()) {
    return { status: 'active', expiresAt: user.subscription_expires_at, plan: user.subscription_plan };
  }
  const daysLeft = TRIAL_DAYS - Math.floor((Date.now() - user.trial_start) / 86400000);
  return { status: daysLeft > 0 ? 'trial' : 'expired', daysLeft: Math.max(0, daysLeft) };
}

async function handleAdminLogin(req, res) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  let body;
  try { body = JSON.parse(Buffer.concat(chunks).toString() || '{}'); }
  catch { return json(res, 400, { message: 'Corps invalide' }); }

  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    console.error('[Admin] ADMIN_PASSWORD non défini — accès admin refusé par défaut.');
    return json(res, 503, { message: 'Accès administrateur non configuré sur ce serveur' });
  }
  if (body.password !== adminPassword) {
    return json(res, 401, { message: 'Mot de passe incorrect' });
  }
  const token = signToken({ admin: true });
  json(res, 200, { token });
}
// Petit utilitaire local — index.js fournit déjà `json` normalement, mais
// cette route est en style "legacy" (elle lit son propre corps) donc on le
// redéfinit ici à l'identique pour rester autonome.
function json(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(body);
}

async function handleAdminListUsers(req, res, { json }) {
  const users = db.prepare('SELECT * FROM users ORDER BY created_at DESC').all();
  const rows = users.map(u => {
    const company = db.prepare('SELECT name, phone, store_slug, live_active FROM companies WHERE user_id = ?').get(u.id);
    const salesCount = db.prepare('SELECT COUNT(*) c FROM sales WHERE company_id = (SELECT id FROM companies WHERE user_id = ?)').get(u.id).c;
    const invoicesCount = db.prepare('SELECT COUNT(*) c FROM invoices WHERE company_id = (SELECT id FROM companies WHERE user_id = ?)').get(u.id).c;
    const sub = computeSubscriptionStatus(u);
    return {
      id: u.id, name: u.name, phone: u.phone, email: u.email,
      companyName: company ? company.name : null,
      createdAt: u.created_at,
      subscriptionStatus: sub.status, subscriptionExpiresAt: sub.expiresAt || null,
      subscriptionPlan: sub.plan || null, trialDaysLeft: sub.daysLeft,
      activityCount: salesCount + invoicesCount,
      storeSlug: company ? company.store_slug : null, liveActive: company ? !!company.live_active : false
    };
  });
  json(res, 200, { users: rows });
}

async function handleAdminResetPassword(req, res, { json, body, params }) {
  const newPassword = (body.new_password || '').trim();
  if (!newPassword || newPassword.length < 6) return json(res, 400, { message: 'Le mot de passe doit contenir au moins 6 caractères' });
  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(params.id);
  if (!user) return json(res, 404, { message: 'Utilisateur introuvable' });
  const { hash, salt } = hashPassword(newPassword);
  db.prepare('UPDATE users SET password_hash = ?, password_salt = ? WHERE id = ?').run(hash, salt, user.id);
  json(res, 200, { ok: true });
}

async function handleAdminSetSubscription(req, res, { json, body, params }) {
  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(params.id);
  if (!user) return json(res, 404, { message: 'Utilisateur introuvable' });
  const status = body.status; // 'active' | 'trial' | 'expired'
  if (!['active', 'trial', 'expired'].includes(status)) return json(res, 400, { message: 'Statut invalide' });

  if (status === 'active') {
    const days = Math.max(1, Number(body.days) || 30);
    db.prepare('UPDATE users SET subscription_status=?, subscription_expires_at=?, subscription_plan=? WHERE id=?')
      .run('active', Date.now() + days * 86400000, body.plan || null, user.id);
  } else if (status === 'trial') {
    // Relance un essai frais — utile si quelqu'un a besoin d'un peu plus de temps.
    db.prepare('UPDATE users SET subscription_status=?, subscription_expires_at=NULL, trial_start=? WHERE id=?')
      .run('trial', Date.now(), user.id);
  } else {
    db.prepare('UPDATE users SET subscription_status=? WHERE id=?').run('expired', user.id);
  }
  json(res, 200, { ok: true });
}

async function handleMeSubscription(req, res, { json, user }) {
  const full = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
  const sub = computeSubscriptionStatus(full);
  json(res, 200, { status: sub.status, subscriptionExpiresAt: sub.expiresAt || null, trialStart: full.trial_start });
}

// Export brut de toutes les données — un filet de sécurité en attendant une
// vraie sauvegarde automatique (qui demande un disque persistant).
async function handleAdminExport(req, res) {
  const tables = ['users', 'companies', 'clients', 'products', 'drivers', 'invoices', 'invoice_items', 'sales', 'sale_items'];
  const dump = {};
  for (const t of tables) dump[t] = db.prepare(`SELECT * FROM ${t}`).all();
  const body = JSON.stringify(dump, null, 2);
  res.writeHead(200, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Disposition': `attachment; filename="faktu-export-${new Date().toISOString().slice(0,10)}.json"`
  });
  res.end(body);
}

module.exports = {
  handleAdminLogin, handleAdminListUsers, handleAdminResetPassword,
  handleAdminSetSubscription, handleMeSubscription, handleAdminExport,
  computeSubscriptionStatus
};

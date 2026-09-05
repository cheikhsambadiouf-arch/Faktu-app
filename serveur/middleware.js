// middleware.js — Résolution de l'utilisateur authentifié à partir du jeton
// Bearer, réutilisée par toutes les routes protégées.

const db = require('./db');
const { verifyToken } = require('./auth-utils');

function getAuthUser(req) {
  const header = req.headers['authorization'] || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  const payload = verifyToken(token);
  if (!payload) return null;
  const user = db.prepare('SELECT id, name, phone, email, created_at FROM users WHERE id = ?').get(payload.uid);
  return user || null;
}

module.exports = { getAuthUser };

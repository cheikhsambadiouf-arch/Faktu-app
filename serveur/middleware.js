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

// Complètement indépendant des comptes utilisateurs — un jeton admin est
// signé avec { admin: true } plutôt qu'un uid, donc ne peut jamais être
// confondu avec (ni obtenu via) un compte normal.
function getAdminAuth(req) {
  const header = req.headers['authorization'] || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  const payload = verifyToken(token);
  return !!(payload && payload.admin === true);
}

module.exports = { getAuthUser, getAdminAuth };

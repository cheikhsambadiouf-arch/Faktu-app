// auth-utils.js — Hachage de mot de passe (scrypt) et jetons de session
// signés (HMAC), sans dépendance externe (pas de bcrypt, pas de jsonwebtoken).

const crypto = require('crypto');

const TOKEN_SECRET = process.env.TOKEN_SECRET || 'CHANGE_ME_IN_PRODUCTION_' + 'dev_only_secret';
const TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 jours

if (!process.env.TOKEN_SECRET) {
  console.warn('⚠️  TOKEN_SECRET non défini — un secret de développement est utilisé. ' +
    'Définissez la variable d\'environnement TOKEN_SECRET avant tout déploiement réel.');
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { hash, salt };
}

function verifyPassword(password, hash, salt) {
  const check = crypto.scryptSync(password, salt, 64).toString('hex');
  // Comparaison en temps constant pour éviter les attaques par mesure de timing.
  const a = Buffer.from(hash, 'hex');
  const b = Buffer.from(check, 'hex');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function base64url(input) {
  return Buffer.from(input).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function base64urlDecode(input) {
  input = input.replace(/-/g, '+').replace(/_/g, '/');
  while (input.length % 4) input += '=';
  return Buffer.from(input, 'base64').toString();
}

function signToken(payload) {
  const body = { ...payload, exp: Date.now() + TOKEN_TTL_MS };
  const encoded = base64url(JSON.stringify(body));
  const sig = crypto.createHmac('sha256', TOKEN_SECRET).update(encoded).digest('hex');
  return `${encoded}.${sig}`;
}

function verifyToken(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;
  const [encoded, sig] = token.split('.');
  const expectedSig = crypto.createHmac('sha256', TOKEN_SECRET).update(encoded).digest('hex');
  const a = Buffer.from(sig || '', 'hex');
  const b = Buffer.from(expectedSig, 'hex');
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  let payload;
  try { payload = JSON.parse(base64urlDecode(encoded)); } catch { return null; }
  if (!payload.exp || Date.now() > payload.exp) return null;
  return payload;
}

module.exports = { hashPassword, verifyPassword, signToken, verifyToken };

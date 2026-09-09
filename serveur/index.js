// index.js — Serveur FAKTU
// Aucune dépendance externe : http natif + node:sqlite + crypto natif.
// Démarrage : node index.js   (port par défaut : 3000, voir variable PORT)

const http = require('http');
const crypto = require('crypto');
const db = require('./db');
const { hashPassword, verifyPassword, signToken } = require('./auth-utils');
const { getAuthUser } = require('./middleware');
const { handleGetCompany, handleUpdateCompany } = require('./companies');
const { handleListClients, handleCreateClient, handleUpdateClient, handleDeleteClient } = require('./clients');
const { handleListProducts, handleCreateProduct, handleUpdateProduct, handleDeleteProduct } = require('./products');
const { handleListDrivers, handleCreateDriver, handleDeleteDriver } = require('./drivers');
const {
  handleListInvoices, handleGetInvoice, handleCreateInvoice, handleRecordPayment: handleInvoicePayment,
  handleAssignDriver: handleInvoiceAssignDriver, handleMarkDelivered: handleInvoiceDelivered, handleDeleteInvoice,
  handleGenerateLink: handleInvoiceGenerateLink, handleGenerateDriverLink: handleInvoiceGenerateDriverLink
} = require('./invoices');
const {
  handleListSales, handleGetSale, handleCreateSale, handleRecordPayment: handleSalePayment,
  handleAssignDriver: handleSaleAssignDriver, handleMarkDelivered: handleSaleDelivered, handleDeleteSale,
  handleGenerateLink: handleSaleGenerateLink, handleGenerateDriverLink: handleSaleGenerateDriverLink
} = require('./sales');
const {
  handlePublicGetOrder, handlePublicValidate, handlePublicReportPayment,
  handlePublicPaydunyaCheckout, handlePaydunyaIPN, handlePublicCheckPayment,
  handlePublicGetDelivery, handleDriverConfirmDelivery, handlePublicClientConfirmDelivery
} = require('./public-orders');
const { renderPublicOrderPage } = require('./public-page');
const { renderDeliveryPage } = require('./delivery-page');

const PORT = process.env.PORT || 3000;
const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_DURATION_MS = 60 * 1000; // 60 secondes, comme côté client existant

function json(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
  });
  res.end(body);
}

function html(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => {
      data += chunk;
      if (data.length > 1e6) { req.destroy(); reject(new Error('Payload trop volumineux')); }
    });
    req.on('end', () => {
      if (!data) return resolve({});
      const contentType = req.headers['content-type'] || '';
      if (contentType.includes('application/x-www-form-urlencoded')) {
        // Format utilisé par la notification IPN de PayDunya, pas du JSON.
        try {
          const parsed = {};
          for (const pair of data.split('&')) {
            const [k, v] = pair.split('=');
            parsed[decodeURIComponent(k)] = decodeURIComponent((v || '').replace(/\+/g, ' '));
          }
          return resolve(parsed);
        } catch { return reject(new Error('Corps invalide')); }
      }
      try { resolve(JSON.parse(data)); }
      catch { reject(new Error('JSON invalide')); }
    });
    req.on('error', reject);
  });
}

function isValidPhone(phone) {
  return typeof phone === 'string' && /^[0-9+][0-9 ]{6,14}$/.test(phone.trim());
}

// ---- Handlers Phase 1 (authentification) — inchangés, déjà testés ----

async function handleRegister(req, res) {
  let body;
  try { body = await readBody(req); } catch (e) { return json(res, 400, { message: e.message }); }

  const name = (body.name || '').trim();
  const phone = (body.phone || '').trim();
  const email = (body.email || '').trim();
  const password = body.password || '';

  if (!name) return json(res, 400, { message: 'Le nom est requis' });
  if (!isValidPhone(phone)) return json(res, 400, { message: 'Numéro de téléphone invalide' });
  if (!password || password.length < 6) return json(res, 400, { message: 'Le mot de passe doit contenir au moins 6 caractères' });

  const existing = db.prepare('SELECT id FROM users WHERE phone = ?').get(phone);
  if (existing) return json(res, 409, { message: 'Un compte existe déjà avec ce numéro' });

  const { hash, salt } = hashPassword(password);
  const id = crypto.randomUUID();
  const now = Date.now();

  db.prepare(`INSERT INTO users (id, name, phone, email, password_hash, password_salt, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?)`).run(id, name, phone, email || null, hash, salt, now);

  const token = signToken({ uid: id });
  json(res, 201, { token, user: { id, name, phone, email: email || null } });
}

async function handleLogin(req, res) {
  let body;
  try { body = await readBody(req); } catch (e) { return json(res, 400, { message: e.message }); }

  const phone = (body.phone || '').trim();
  const password = body.password || '';
  if (!phone || !password) return json(res, 400, { message: 'Numéro de téléphone et mot de passe requis' });

  // Anti-bruteforce, même logique que côté client (5 tentatives -> verrouillage 60s)
  const lock = db.prepare('SELECT * FROM login_attempts WHERE phone = ?').get(phone);
  if (lock && lock.locked_until && lock.locked_until > Date.now()) {
    const secondsLeft = Math.ceil((lock.locked_until - Date.now()) / 1000);
    return json(res, 429, { message: `Trop de tentatives. Réessayez dans ${secondsLeft}s.` });
  }

  const user = db.prepare('SELECT * FROM users WHERE phone = ?').get(phone);
  const ok = user && verifyPassword(password, user.password_hash, user.password_salt);

  if (!ok) {
    const attempts = (lock ? lock.attempts : 0) + 1;
    const lockedUntil = attempts >= MAX_LOGIN_ATTEMPTS ? Date.now() + LOCK_DURATION_MS : null;
    db.prepare(`INSERT INTO login_attempts (phone, attempts, locked_until) VALUES (?, ?, ?)
                ON CONFLICT(phone) DO UPDATE SET attempts = excluded.attempts, locked_until = excluded.locked_until`)
      .run(phone, lockedUntil ? 0 : attempts, lockedUntil);
    return json(res, 401, { message: 'Numéro ou mot de passe incorrect' });
  }

  // Connexion réussie : on remet le compteur à zéro
  db.prepare('DELETE FROM login_attempts WHERE phone = ?').run(phone);

  const token = signToken({ uid: user.id });
  json(res, 200, { token, user: { id: user.id, name: user.name, phone: user.phone, email: user.email } });
}

async function handleMe(req, res) {
  const user = getAuthUser(req);
  if (!user) return json(res, 401, { message: 'Non authentifié' });
  json(res, 200, { user });
}

// ---- Routeur ----
// Deux styles de route cohabitent :
//  - "legacy" (Phase 1, déjà testée) : handler(req, res), gère elle-même son
//    corps de requête et son authentification.
//  - "standard" (Phase 2+) : handler(req, res, ctx) où ctx fournit déjà
//    { json, user, body, params } — l'authentification et le parsing JSON
//    sont gérés une seule fois par le routeur.

const routes = [
  { method: 'POST', path: '/api/auth/register', legacy: handleRegister },
  { method: 'POST', path: '/api/auth/login', legacy: handleLogin },
  { method: 'GET', path: '/api/auth/me', legacy: handleMe },

  { method: 'GET', path: '/api/company', auth: true, handler: handleGetCompany },
  { method: 'PUT', path: '/api/company', auth: true, parseBody: true, handler: handleUpdateCompany },

  { method: 'GET', path: '/api/clients', auth: true, handler: handleListClients },
  { method: 'POST', path: '/api/clients', auth: true, parseBody: true, handler: handleCreateClient },
  { method: 'PUT', path: '/api/clients/:id', auth: true, parseBody: true, handler: handleUpdateClient },
  { method: 'DELETE', path: '/api/clients/:id', auth: true, handler: handleDeleteClient },

  { method: 'GET', path: '/api/products', auth: true, handler: handleListProducts },
  { method: 'POST', path: '/api/products', auth: true, parseBody: true, handler: handleCreateProduct },
  { method: 'PUT', path: '/api/products/:id', auth: true, parseBody: true, handler: handleUpdateProduct },
  { method: 'DELETE', path: '/api/products/:id', auth: true, handler: handleDeleteProduct },

  { method: 'GET', path: '/api/drivers', auth: true, handler: handleListDrivers },
  { method: 'POST', path: '/api/drivers', auth: true, parseBody: true, handler: handleCreateDriver },
  { method: 'DELETE', path: '/api/drivers/:id', auth: true, handler: handleDeleteDriver },

  { method: 'GET', path: '/api/invoices', auth: true, handler: handleListInvoices },
  { method: 'GET', path: '/api/invoices/:id', auth: true, handler: handleGetInvoice },
  { method: 'POST', path: '/api/invoices', auth: true, parseBody: true, handler: handleCreateInvoice },
  { method: 'POST', path: '/api/invoices/:id/payment', auth: true, parseBody: true, handler: handleInvoicePayment },
  { method: 'POST', path: '/api/invoices/:id/driver', auth: true, parseBody: true, handler: handleInvoiceAssignDriver },
  { method: 'POST', path: '/api/invoices/:id/delivered', auth: true, handler: handleInvoiceDelivered },
  { method: 'DELETE', path: '/api/invoices/:id', auth: true, handler: handleDeleteInvoice },
  { method: 'POST', path: '/api/invoices/:id/link', auth: true, handler: handleInvoiceGenerateLink },
  { method: 'POST', path: '/api/invoices/:id/driver-link', auth: true, handler: handleInvoiceGenerateDriverLink },

  { method: 'GET', path: '/api/sales', auth: true, handler: handleListSales },
  { method: 'GET', path: '/api/sales/:id', auth: true, handler: handleGetSale },
  { method: 'POST', path: '/api/sales', auth: true, parseBody: true, handler: handleCreateSale },
  { method: 'POST', path: '/api/sales/:id/payment', auth: true, parseBody: true, handler: handleSalePayment },
  { method: 'POST', path: '/api/sales/:id/driver', auth: true, parseBody: true, handler: handleSaleAssignDriver },
  { method: 'POST', path: '/api/sales/:id/delivered', auth: true, handler: handleSaleDelivered },
  { method: 'DELETE', path: '/api/sales/:id', auth: true, handler: handleDeleteSale },
  { method: 'POST', path: '/api/sales/:id/link', auth: true, handler: handleSaleGenerateLink },
  { method: 'POST', path: '/api/sales/:id/driver-link', auth: true, handler: handleSaleGenerateDriverLink },

  // Routes publiques : aucune authentification, protégées uniquement par le
  // jeton non-devinable dans l'URL. Fonctionnent aussi bien pour une vente
  // directe que pour une facture classique — c'est ce que le client ouvre
  // depuis WhatsApp, sans jamais avoir besoin d'un compte FAKTU.
  { method: 'GET', path: '/api/public/orders/:token', handler: handlePublicGetOrder },
  { method: 'POST', path: '/api/public/orders/:token/validate', parseBody: true, handler: handlePublicValidate },
  { method: 'POST', path: '/api/public/orders/:token/payment-reported', handler: handlePublicReportPayment },
  { method: 'POST', path: '/api/public/orders/:token/paydunya-checkout', handler: handlePublicPaydunyaCheckout },
  { method: 'GET', path: '/api/public/orders/:token/check-payment', handler: handlePublicCheckPayment },
  { method: 'POST', path: '/api/public/orders/:token/confirm-delivery', handler: handlePublicClientConfirmDelivery },
  { method: 'POST', path: '/api/paydunya/ipn', parseBody: true, handler: handlePaydunyaIPN },

  // Lien public du livreur — jeton distinct de celui du client, pour la
  // double confirmation de livraison.
  { method: 'GET', path: '/api/public/delivery/:token', handler: handlePublicGetDelivery },
  { method: 'POST', path: '/api/public/delivery/:token/confirm', handler: handleDriverConfirmDelivery }
];

function matchRoute(method, pathname) {
  const pathSegs = pathname.split('/').filter(Boolean);
  for (const route of routes) {
    if (route.method !== method) continue;
    const routeSegs = route.path.split('/').filter(Boolean);
    if (routeSegs.length !== pathSegs.length) continue;
    const params = {};
    let match = true;
    for (let i = 0; i < routeSegs.length; i++) {
      if (routeSegs[i].startsWith(':')) params[routeSegs[i].slice(1)] = decodeURIComponent(pathSegs[i]);
      else if (routeSegs[i] !== pathSegs[i]) { match = false; break; }
    }
    if (match) return { route, params };
  }
  return null;
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (req.method === 'OPTIONS') return json(res, 204, {});
  if (url.pathname === '/health') return json(res, 200, { status: 'ok' });

  if (req.method === 'GET' && url.pathname.startsWith('/order/')) {
    const token = decodeURIComponent(url.pathname.slice('/order/'.length));
    return html(res, 200, renderPublicOrderPage(token));
  }
  if (req.method === 'GET' && url.pathname.startsWith('/delivery/')) {
    const token = decodeURIComponent(url.pathname.slice('/delivery/'.length));
    return html(res, 200, renderDeliveryPage(token));
  }

  const found = matchRoute(req.method, url.pathname);
  if (!found) return json(res, 404, { message: 'Route inconnue' });
  const { route, params } = found;

  const run = async () => {
    if (route.legacy) return route.legacy(req, res);

    let user = null;
    if (route.auth) {
      user = getAuthUser(req);
      if (!user) return json(res, 401, { message: 'Non authentifié' });
    }
    let body = {};
    if (route.parseBody) {
      try { body = await readBody(req); } catch (e) { return json(res, 400, { message: e.message }); }
    }
    return route.handler(req, res, { json, user, body, params });
  };

  run().catch(err => {
    console.error(err);
    json(res, 500, { message: 'Erreur serveur' });
  });
});

server.listen(PORT, () => {
  console.log(`FAKTU backend démarré sur le port ${PORT}`);
});

module.exports = server;

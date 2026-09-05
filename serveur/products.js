// products.js — CRUD produits/catalogue, cantonné à l'entreprise appelante.

const crypto = require('crypto');
const db = require('./db');
const { getOrCreateCompany } = require('./companies');

async function handleListProducts(req, res, { json, user }) {
  const company = getOrCreateCompany(user.id);
  const rows = db.prepare('SELECT * FROM products WHERE company_id = ? AND deleted = 0 ORDER BY name COLLATE NOCASE')
    .all(company.id);
  json(res, 200, { products: rows });
}

async function handleCreateProduct(req, res, { json, user, body }) {
  const company = getOrCreateCompany(user.id);
  const name = (body.name || '').trim();
  if (!name) return json(res, 400, { message: 'Le nom du produit est requis' });
  const price = Number(body.price) || 0;
  if (price < 0) return json(res, 400, { message: 'Le prix ne peut pas être négatif' });

  const id = crypto.randomUUID();
  const now = Date.now();
  db.prepare(`INSERT INTO products (id, company_id, name, reference, category, price, cost_price, stock, alert_threshold, unit, deleted, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`)
    .run(id, company.id, name, body.reference || null, body.category || null, price,
      body.cost_price != null ? Number(body.cost_price) : null,
      Number(body.stock) || 0, Number(body.alert_threshold) || 0, body.unit || null, now, now);

  json(res, 201, { product: db.prepare('SELECT * FROM products WHERE id = ?').get(id) });
}

function findOwnedProduct(companyId, productId) {
  return db.prepare('SELECT * FROM products WHERE id = ? AND company_id = ?').get(productId, companyId);
}

async function handleUpdateProduct(req, res, { json, user, body, params }) {
  const company = getOrCreateCompany(user.id);
  const existing = findOwnedProduct(company.id, params.id);
  if (!existing) return json(res, 404, { message: 'Produit introuvable' });

  const name = body.name != null ? body.name.trim() : existing.name;
  if (!name) return json(res, 400, { message: 'Le nom du produit est requis' });

  db.prepare(`UPDATE products SET name=?, reference=?, category=?, price=?, cost_price=?, stock=?, alert_threshold=?, unit=?, updated_at=? WHERE id=?`)
    .run(name,
      body.reference != null ? body.reference : existing.reference,
      body.category != null ? body.category : existing.category,
      body.price != null ? Number(body.price) : existing.price,
      body.cost_price != null ? Number(body.cost_price) : existing.cost_price,
      body.stock != null ? Number(body.stock) : existing.stock,
      body.alert_threshold != null ? Number(body.alert_threshold) : existing.alert_threshold,
      body.unit != null ? body.unit : existing.unit,
      Date.now(), existing.id);

  json(res, 200, { product: db.prepare('SELECT * FROM products WHERE id = ?').get(existing.id) });
}

async function handleDeleteProduct(req, res, { json, user, params }) {
  const company = getOrCreateCompany(user.id);
  const existing = findOwnedProduct(company.id, params.id);
  if (!existing) return json(res, 404, { message: 'Produit introuvable' });
  db.prepare('UPDATE products SET deleted = 1, deleted_at = ? WHERE id = ?').run(Date.now(), existing.id);
  json(res, 200, { ok: true });
}

module.exports = {
  handleListProducts, handleCreateProduct, handleUpdateProduct, handleDeleteProduct,
  findOwnedProduct
};

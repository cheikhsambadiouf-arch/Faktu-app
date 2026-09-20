
// ai/actions.js — Registre des actions FAKTU exploitables par l'assistant.
//
// Chaque action est complètement séparée du modèle IA : elle reçoit des
// paramètres déjà validés (jamais un texte brut), et exécute la même
// logique métier que le reste de FAKTU — rien n'est dupliqué, rien n'est
// exécuté directement en base par l'IA elle-même.
//
// Pour ajouter une action : l'ajouter ici ET dans le prompt système de
// ai/index.js. Rien d'autre dans le projet n'a besoin de changer.

const db = require('./../db');
const { createSaleForCompany } = require('./../sales');
const { createInvoiceForCompany } = require('./../invoices');
const { findOwnedProduct } = require('./../products');
const { ensureToken } = require('./../public-orders');

function fmtFcfa(n) {
  return Math.round(n || 0).toLocaleString('fr-FR') + ' FCFA';
}

function saleTotal(sale) {
  const items = db.prepare('SELECT qty, unit_price FROM sale_items WHERE sale_id = ?').all(sale.id);
  return items.reduce((s, it) => s + it.qty * it.unit_price, 0);
}
function invoiceTotal(inv) {
  const items = db.prepare('SELECT qty, unit_price FROM invoice_items WHERE invoice_id = ?').all(inv.id);
  const subtotal = items.reduce((s, it) => s + it.qty * it.unit_price, 0);
  const afterDiscount = subtotal * (1 - (inv.discount_pct || 0) / 100);
  return afterDiscount * (1 + (inv.tva_rate || 0) / 100);
}

const ACTIONS = {

  create_sale: {
    isWrite: true,
    requiresCustomer: true,
    execute(company, p) {
      const items = (p.items || []).map(it => ({
        description: it.unit ? `${it.unit} de ${it.product}` : it.product,
        qty: Number(it.quantity) || 1,
        unit_price: Number(it.unit_price) || 0
      }));
      const sale = createSaleForCompany(company, {
        client_name: p.customer_name, client_phone: p.customer_phone, items
      });
      const total = items.reduce((s, it) => s + it.qty * it.unit_price, 0);
      return {
        message: `C'est fait 👍 ${items.map(it => it.description).join(', ')} vendu${items.length > 1 ? 's' : ''} à ${p.customer_name} pour ${fmtFcfa(total)}.`,
        data: { sale }
      };
    }
  },

  create_invoice: {
    isWrite: true,
    requiresCustomer: true,
    execute(company, p) {
      // Un montant global sans détail d'articles est reformulé en une seule
      // ligne — FAKTU exige toujours au moins un article pour rester
      // cohérent avec le reste de l'application (jamais de facture "vide").
      const items = Array.isArray(p.items) && p.items.length
        ? p.items.map(it => ({ description: it.unit ? `${it.unit} de ${it.product}` : it.product, qty: Number(it.quantity) || 1, unit_price: Number(it.unit_price) || 0 }))
        : [{ description: 'Prestation', qty: 1, unit_price: Number(p.amount) || 0 }];
      const invoice = createInvoiceForCompany(company, {
        client_name: p.customer_name, client_id: p.matched_client_id || null, items
      });
      const total = items.reduce((s, it) => s + it.qty * it.unit_price, 0);
      return {
        message: `C'est fait 👍 Facture ${invoice.number} créée pour ${p.customer_name}, ${fmtFcfa(total)}.`,
        data: { invoice }
      };
    }
  },

  get_daily_sales: {
    isWrite: false,
    execute(company) {
      const today = new Date().toISOString().slice(0, 10);
      const rows = db.prepare('SELECT id FROM sales WHERE company_id = ? AND deleted = 0 AND date = ?').all(company.id, today);
      const total = rows.reduce((sum, s) => sum + saleTotal(s), 0);
      return {
        message: rows.length
          ? `Aujourd'hui, tu as fait ${rows.length} vente${rows.length > 1 ? 's' : ''} pour ${fmtFcfa(total)}.`
          : `Aucune vente enregistrée aujourd'hui pour l'instant.`,
        data: { count: rows.length, total }
      };
    }
  },

  get_customer_balance: {
    isWrite: false,
    requiresCustomer: true,
    execute(company, p) {
      const needle = `%${(p.customer_name || '').toLowerCase()}%`;
      const sales = db.prepare(`SELECT * FROM sales WHERE company_id = ? AND deleted = 0 AND payment_status != 'payé' AND LOWER(client_name) LIKE ?`).all(company.id, needle);
      const invoices = db.prepare(`SELECT * FROM invoices WHERE company_id = ? AND deleted = 0 AND status != 'paye' AND LOWER(client_name_snapshot) LIKE ?`).all(company.id, needle);

      const salesDue = sales.reduce((s, sale) => s + (saleTotal(sale) - sale.amount_paid), 0);
      const invoicesDue = invoices.reduce((s, inv) => s + (invoiceTotal(inv) - inv.amount_paid), 0);
      const total = salesDue + invoicesDue;

      return {
        message: total > 0
          ? `${p.customer_name} te doit encore ${fmtFcfa(total)}.`
          : `${p.customer_name} n'a aucune dette en cours — tout est à jour.`,
        data: { total, sales_count: sales.length, invoices_count: invoices.length }
      };
    }
  },

  update_stock: {
    isWrite: true,
    execute(company, p) {
      const needle = (p.product || '').trim().toLowerCase();
      if (!needle) { const e = new Error('Nom de produit manquant'); e.status = 400; throw e; }
      const products = db.prepare('SELECT * FROM products WHERE company_id = ? AND deleted = 0 AND LOWER(name) LIKE ?').all(company.id, `%${needle}%`);
      if (products.length === 0) {
        const e = new Error(`Aucun produit "${p.product}" trouvé dans ton catalogue — ajoute-le d'abord dans Vente Directe.`);
        e.status = 404;
        throw e;
      }
      if (products.length > 1) {
        const e = new Error(`Plusieurs produits correspondent à "${p.product}" — précise lequel (${products.map(x => x.name).join(', ')}).`);
        e.status = 409;
        throw e;
      }
      const product = products[0];
      const qty = Number(p.quantity) || 0;
      const newStock = product.stock + qty;
      db.prepare('UPDATE products SET stock=?, updated_at=? WHERE id=?').run(newStock, Date.now(), product.id);
      return {
        message: `C'est fait 👍 Stock de ${product.name} mis à jour : ${newStock} en stock (+${qty}).`,
        data: { product_id: product.id, new_stock: newStock }
      };
    }
  },

  send_invoice_whatsapp: {
    isWrite: true,
    requiresCustomer: true,
    // FAKTU n'a pas d'intégration WhatsApp Business API — comme partout
    // ailleurs dans l'app, "envoyer" prépare un lien wa.me avec le message
    // déjà rédigé ; c'est le vendeur qui appuie sur envoyer depuis son
    // propre WhatsApp. On ne prétend jamais qu'un message part tout seul.
    execute(company, p, ctx) {
      const needle = `%${(p.customer_name || '').toLowerCase()}%`;
      let doc = null, kind = null;
      if (p.document_number) {
        doc = db.prepare('SELECT * FROM invoices WHERE company_id = ? AND deleted = 0 AND number = ?').get(company.id, p.document_number);
        if (doc) kind = 'invoice';
        if (!doc) { doc = db.prepare('SELECT * FROM sales WHERE company_id = ? AND deleted = 0 AND number = ?').get(company.id, p.document_number); if (doc) kind = 'sale'; }
      } else {
        doc = db.prepare(`SELECT * FROM invoices WHERE company_id = ? AND deleted = 0 AND LOWER(client_name_snapshot) LIKE ? ORDER BY created_at DESC LIMIT 1`).get(company.id, needle);
        if (doc) kind = 'invoice';
        if (!doc) { doc = db.prepare(`SELECT * FROM sales WHERE company_id = ? AND deleted = 0 AND LOWER(client_name) LIKE ? ORDER BY created_at DESC LIMIT 1`).get(company.id, needle); if (doc) kind = 'sale'; }
      }
      if (!doc) {
        const e = new Error(`Je ne trouve aucune facture ou vente pour ${p.customer_name}.`);
        e.status = 404;
        throw e;
      }
      const token = ensureToken(kind === 'invoice' ? 'invoices' : 'sales', doc);
      const clientName = kind === 'invoice' ? doc.client_name_snapshot : doc.client_name;
      const clientPhone = kind === 'sale' ? doc.client_phone : (p.customer_phone || '');
      const link = `${(ctx && ctx.baseUrl) || ''}/order/${token}`;
      const text = `Bonjour ${clientName}, voici votre document ${doc.number} chez ${company.name || ''} :\n\n${link}\n\nMerci pour votre confiance !`;
      return {
        message: `Voici le lien pour ${doc.number} — touche "Ouvrir WhatsApp" pour l'envoyer à ${clientName}.`,
        data: { wa_phone: (clientPhone || '').replace(/[^0-9]/g, ''), wa_text: text, document_number: doc.number }
      };
    }
  }

};

module.exports = { ACTIONS };

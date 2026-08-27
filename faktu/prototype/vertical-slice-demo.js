'use strict';

/**
 * FAKTU — Prototype de validation de la boucle centrale (Node.js, sans dépendance).
 *
 * POURQUOI CE FICHIER EXISTE :
 * Cet environnement n'a pas d'accès réseau (donc pas de `npm install`,
 * pas de PostgreSQL, pas de Flutter). Le vrai code cible se trouve dans
 * apps/api/ (NestJS + PostgreSQL) mais n'a PAS pu être exécuté ici.
 *
 * Ce script reproduit fidèlement la MÊME logique métier (preview,
 * confirmation, décrément de stock, paiements, doublons...) avec un
 * store en mémoire, pour pouvoir réellement l'EXÉCUTER et vérifier
 * que la boucle centrale de FAKTU fonctionne comme spécifié
 * (section 41 — TESTS du prompt maître).
 *
 * Statut réel : CE fichier est testé (exécuté ci-dessous, résultats
 * imprimés). Le code NestJS/PostgreSQL équivalent est CODÉ mais NON
 * exécuté/testé faute d'environnement (voir STATUT.md).
 */

let idCounter = 1;
const nextId = () => `id-${idCounter++}`;

const db = {
  customers: [],
  products: [],
  stock: {},        // product_id -> quantity
  invoices: [],
  payments: [],
  auditLogs: [],
};

function seed() {
  const customer = { id: nextId(), name: 'Mamadou Ndiaye' };
  const product = { id: nextId(), name: 'Ciment 50 kg', sale_price: 6500, tax_rate: 0 };
  db.customers.push(customer);
  db.products.push(product);
  db.stock[product.id] = 100;
  return { customer, product };
}

function findCustomerByName(name) {
  return db.customers.filter((c) => c.name.toLowerCase().includes(name.toLowerCase()));
}

function findProductByName(name) {
  return db.products.filter((p) => p.name.toLowerCase().includes(name.toLowerCase()));
}

// ---- preview (ne touche jamais au stock) ----
function previewInvoice({ customer_query, items }) {
  const customers = findCustomerByName(customer_query);
  if (customers.length === 0) return { error: 'CUSTOMER_NOT_FOUND', customer_query };
  if (customers.length > 1) return { error: 'AMBIGUOUS_CUSTOMER', candidates: customers };
  const customer = customers[0];

  const resolvedItems = [];
  for (const item of items) {
    const products = findProductByName(item.product_query);
    if (products.length === 0) return { error: 'PRODUCT_NOT_FOUND', query: item.product_query };
    if (products.length > 1) return { error: 'AMBIGUOUS_PRODUCT', candidates: products };
    const product = products[0];
    const available = db.stock[product.id] ?? 0;
    if (available < item.quantity) {
      return {
        error: 'INSUFFICIENT_STOCK',
        message: `Il reste seulement ${available} ${product.name} alors que vous en demandez ${item.quantity}.`,
      };
    }
    resolvedItems.push({
      product_id: product.id,
      description: product.name,
      quantity: item.quantity,
      unit_price: item.unit_price ?? product.sale_price,
    });
  }

  const subtotal = resolvedItems.reduce((s, i) => s + i.quantity * i.unit_price, 0);
  const total = subtotal;

  const invoice = {
    id: nextId(),
    status: 'PENDING_CONFIRMATION',
    customer_id: customer.id,
    items: resolvedItems,
    subtotal,
    total,
    amount_paid: 0,
    balance_due: total,
    number: null,
  };
  db.invoices.push(invoice);

  return { preview_id: invoice.id, requires_confirmation: true, customer, items: resolvedItems, subtotal, total };
}

// ---- confirm (transaction : décrément stock + numérotation + audit) ----
let invoiceSeq = 0;
function confirmInvoice({ preview_id, confirmation }) {
  const invoice = db.invoices.find((i) => i.id === preview_id);
  if (!invoice) return { error: 'NOT_FOUND' };

  if (!confirmation) {
    invoice.status = 'CANCELLED';
    return { status: 'CANCELLED' };
  }

  if (invoice.status !== 'PENDING_CONFIRMATION') {
    return { error: 'INVOICE_NOT_PENDING', status: invoice.status };
  }

  // re-vérification du stock (peut avoir changé depuis la preview)
  for (const item of invoice.items) {
    const available = db.stock[item.product_id] ?? 0;
    if (available < item.quantity) {
      return { error: 'INSUFFICIENT_STOCK', product_id: item.product_id, available, requested: item.quantity };
    }
  }

  for (const item of invoice.items) {
    db.stock[item.product_id] -= item.quantity;
  }

  invoiceSeq += 1;
  invoice.number = `FAC-2026-${String(invoiceSeq).padStart(6, '0')}`;
  invoice.status = 'ISSUED';

  db.auditLogs.push({ action: 'CREATE_INVOICE', entity_id: invoice.id, at: new Date().toISOString() });

  return invoice;
}

// ---- paiement (avec idempotence) ----
function recordPayment({ invoice_id, amount, idempotency_key }) {
  const existing = db.payments.find((p) => p.idempotency_key === idempotency_key);
  if (existing) return { duplicate: true, payment: existing };

  const invoice = db.invoices.find((i) => i.id === invoice_id);
  if (!invoice) return { error: 'INVOICE_NOT_FOUND' };

  if (amount > invoice.balance_due) {
    return {
      error: 'PAYMENT_EXCEEDS_BALANCE',
      message: `Le paiement dépasse le solde de ${amount - invoice.balance_due} FCFA.`,
    };
  }

  const payment = { id: nextId(), invoice_id, amount, idempotency_key };
  db.payments.push(payment);

  invoice.amount_paid += amount;
  invoice.balance_due -= amount;
  invoice.status = invoice.balance_due <= 0 ? 'PAID' : 'PARTIALLY_PAID';

  db.auditLogs.push({ action: 'RECORD_PAYMENT', entity_id: invoice.id, at: new Date().toISOString() });

  return { duplicate: false, payment, invoice };
}

// ============================================================
// EXÉCUTION DES TESTS (section 41 du prompt maître)
// ============================================================

function assert(condition, label) {
  const status = condition ? 'PASS' : 'FAIL';
  console.log(`[${status}] ${label}`);
  if (!condition) process.exitCode = 1;
}

console.log('=== FAKTU — Vertical slice demo (exécution réelle) ===\n');

const { customer, product } = seed();
console.log(`Seed : client="${customer.name}", produit="${product.name}", stock initial=${db.stock[product.id]}\n`);

console.log('--- TEST PRINCIPAL ---');
const preview = previewInvoice({
  customer_query: 'Mamadou',
  items: [{ product_query: 'Ciment', quantity: 20, unit_price: 6500 }],
});
assert(preview.total === 130000, `Total calculé = ${preview.total} (attendu 130000)`);

const issued = confirmInvoice({ preview_id: preview.preview_id, confirmation: true });
assert(issued.status === 'ISSUED', `Statut facture = ${issued.status} (attendu ISSUED)`);
assert(db.stock[product.id] === 80, `Stock après vente = ${db.stock[product.id]} (attendu 80)`);
assert(!!issued.number, `Numéro de facture généré = ${issued.number}`);

console.log('\n--- TEST ANNULATION ---');
const preview2 = previewInvoice({ customer_query: 'Mamadou', items: [{ product_query: 'Ciment', quantity: 5 }] });
const stockBefore = db.stock[product.id];
const cancelled = confirmInvoice({ preview_id: preview2.preview_id, confirmation: false });
assert(cancelled.status === 'CANCELLED', `Statut = ${cancelled.status} (attendu CANCELLED)`);
assert(db.stock[product.id] === stockBefore, `Stock inchangé après annulation = ${db.stock[product.id]}`);

console.log('\n--- TEST STOCK (insuffisant) ---');
const previewStock = previewInvoice({ customer_query: 'Mamadou', items: [{ product_query: 'Ciment', quantity: 9999 }] });
assert(previewStock.error === 'INSUFFICIENT_STOCK', `Erreur retournée = ${previewStock.error}`);

console.log('\n--- TEST CLIENT (inconnu) ---');
const previewUnknown = previewInvoice({ customer_query: 'Ibrahima', items: [{ product_query: 'Ciment', quantity: 1 }] });
assert(previewUnknown.error === 'CUSTOMER_NOT_FOUND', `Erreur retournée = ${previewUnknown.error}`);

console.log('\n--- TEST PAIEMENT (partiel) ---');
const pay1 = recordPayment({ invoice_id: issued.id, amount: 50000, idempotency_key: 'pay-001' });
assert(pay1.invoice.balance_due === 80000, `Solde après 50000 payé = ${pay1.invoice.balance_due} (attendu 80000)`);
assert(pay1.invoice.status === 'PARTIALLY_PAID', `Statut = ${pay1.invoice.status}`);

console.log('\n--- TEST PAIEMENT FINAL ---');
const pay2 = recordPayment({ invoice_id: issued.id, amount: 80000, idempotency_key: 'pay-002' });
assert(pay2.invoice.balance_due === 0, `Solde final = ${pay2.invoice.balance_due} (attendu 0)`);
assert(pay2.invoice.status === 'PAID', `Statut = ${pay2.invoice.status} (attendu PAID)`);

console.log('\n--- TEST DOUBLON (même paiement renvoyé deux fois) ---');
const pay2Retry = recordPayment({ invoice_id: issued.id, amount: 80000, idempotency_key: 'pay-002' });
assert(pay2Retry.duplicate === true, `Doublon détecté = ${pay2Retry.duplicate}`);
assert(db.payments.filter((p) => p.idempotency_key === 'pay-002').length === 1, `Un seul paiement enregistré pour pay-002`);

console.log('\n--- TEST PAIEMENT SUPÉRIEUR (dépassement) ---');
const preview3 = previewInvoice({ customer_query: 'Mamadou', items: [{ product_query: 'Ciment', quantity: 1 }] });
const issued3 = confirmInvoice({ preview_id: preview3.preview_id, confirmation: true });
const overpay = recordPayment({ invoice_id: issued3.id, amount: 999999, idempotency_key: 'pay-over' });
assert(overpay.error === 'PAYMENT_EXCEEDS_BALANCE', `Dépassement détecté et bloqué = ${overpay.error}`);

console.log('\n=== Fin des tests ===');
console.log(process.exitCode === 1 ? '\n>>> AU MOINS UN TEST A ÉCHOUÉ <<<' : '\n>>> TOUS LES TESTS SONT PASSÉS <<<');

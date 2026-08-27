'use strict';

/**
 * FAKTU — Extracteur d'intention (règles / regex), FRANÇAIS.
 *
 * RÔLE DANS L'ARCHITECTURE (section 22 du prompt maître) :
 * C'est le filet de sécurité "hors-ligne" / secours de l'Intent Engine.
 * Le chemin principal en production appelle un vrai modèle de langage
 * (voir apps/api/src/ai/ai.service.ts) pour comprendre des phrases
 * naturelles variées. Mais un LLM peut être indisponible (pas de
 * réseau, panne, clé API absente) — hors ligne est un principe du
 * cahier des charges (section 35). Ce module base sur des règles
 * garantit que FAKTU reste utilisable même sans IA externe, pour les
 * formulations les plus courantes.
 *
 * PRINCIPE RESPECTÉ : "Ne jamais inventer" (section 6 / 45).
 * Si une information manque (quantité, prix...), on ne devine JAMAIS
 * une valeur : on retourne `requires_clarification: true` avec la
 * question exacte à poser.
 */

function parseAmount(raw) {
  // "6 500" / "6.500" / "6,500" -> 6500
  const cleaned = raw.replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
  const value = parseFloat(cleaned);
  return Number.isFinite(value) ? value : null;
}

function extractIntent(transcript) {
  const text = transcript.trim();

  // ---- CREATE_INVOICE ----
  // "Fais une facture à Mamadou pour 20 sacs de ciment à 6 500 francs, payable dans 15 jours."
  const invoiceMatch = text.match(/facture\s+(?:à|a)\s+(.+?)\s+pour\s+(.+)/i);
  if (invoiceMatch) {
    const customer = invoiceMatch[1].trim();
    let rest = invoiceMatch[2].trim();

    // clause d'échéance optionnelle, séparée par une virgule
    let dueInDays = null;
    const dueMatch = rest.match(/,?\s*payable\s+dans\s+(\d+)\s+jours?/i);
    if (dueMatch) {
      dueInDays = parseInt(dueMatch[1], 10);
      rest = rest.replace(dueMatch[0], '').trim();
    }

    // ligne complète : "<qté> <unité> de <produit> à <prix> francs"
    const lineMatch = rest.match(
      /(\d+(?:[.,]\d+)?)\s+([a-zàâçéèêëîïôûùüÿñæœ]+)\s+de\s+(.+?)\s+(?:à|a)\s+([\d\s.,]+)\s*(?:francs?|fcfa|f)\b/i,
    );

    if (lineMatch) {
      return {
        intent: 'CREATE_INVOICE',
        confidence: 0.9,
        requires_clarification: false,
        entities: {
          customer_query: customer,
          items: [
            {
              product_query: lineMatch[3].trim().replace(/\.$/, ''),
              quantity: parseAmount(lineMatch[1]),
              unit: lineMatch[2],
              unit_price: parseAmount(lineMatch[4]),
            },
          ],
          due_in_days: dueInDays,
        },
      };
    }

    // Produit mentionné mais SANS quantité -> ne jamais inventer une quantité.
    const productOnlyMatch = rest.match(/pour\s+(?:du|de la|des|de l['’])\s*(.+)/i) || rest.match(/^(.+)$/);
    const productGuess = (productOnlyMatch ? productOnlyMatch[1] : rest).replace(/[.?!]+$/, '').trim();

    return {
      intent: 'CREATE_INVOICE',
      confidence: 0.5,
      requires_clarification: true,
      clarification_question: `Combien de ${productGuess} souhaitez-vous facturer ?`,
      entities: { customer_query: customer, product_query: productGuess },
    };
  }

  // ---- CREATE_PURCHASE ----
  // "J'ai acheté 100 sacs de ciment à 4 800 francs chez Sénégal Matériaux."
  const purchaseMatch = text.match(
    /achet[ée]\s+(\d+(?:[.,]\d+)?)\s+([a-zàâçéèêëîïôûùüÿñæœ]+)\s+de\s+(.+?)\s+(?:à|a)\s+([\d\s.,]+)\s*(?:francs?|fcfa|f)\b(?:\s+chez\s+(.+))?/i,
  );
  if (purchaseMatch) {
    const supplierRaw = purchaseMatch[5] ? purchaseMatch[5].replace(/[.?!]+$/, '').trim() : null;
    return {
      intent: 'CREATE_PURCHASE',
      confidence: supplierRaw ? 0.9 : 0.7,
      requires_clarification: !supplierRaw,
      clarification_question: supplierRaw ? undefined : 'Chez quel fournisseur avez-vous acheté ?',
      entities: {
        product_query: purchaseMatch[3].trim(),
        quantity: parseAmount(purchaseMatch[1]),
        unit: purchaseMatch[2],
        unit_price: parseAmount(purchaseMatch[4]),
        supplier_query: supplierRaw,
      },
    };
  }

  // ---- CREATE_EXPENSE ----
  // "Enregistre 15 000 francs de carburant aujourd'hui."
  const expenseMatch = text.match(
    /enregistre\s+([\d\s.,]+)\s*(?:francs?|fcfa|f)\s+de\s+([a-zàâçéèêëîïôûùüÿñæœ]+)/i,
  );
  if (expenseMatch) {
    const isToday = /aujourd['’]hui/i.test(text);
    return {
      intent: 'CREATE_EXPENSE',
      confidence: 0.85,
      requires_clarification: false,
      entities: {
        amount: parseAmount(expenseMatch[1]),
        category: expenseMatch[2],
        date: isToday ? 'today' : null,
      },
    };
  }

  // ---- GET_REPORT (mode conversationnel, section 20) ----
  if (/comment\s+va\s+mon\s+commerce/i.test(text) || /^rapport\b/i.test(text)) {
    return {
      intent: 'GET_REPORT',
      confidence: 0.8,
      requires_clarification: false,
      entities: {},
    };
  }

  // ---- Rien reconnu ----
  return {
    intent: 'UNKNOWN',
    confidence: 0,
    requires_clarification: true,
    clarification_question: "Je n'ai pas compris. Pouvez-vous reformuler ?",
    entities: {},
  };
}

// ============================================================
// EXÉCUTION — cas tirés directement du prompt maître
// ============================================================

function assert(condition, label) {
  const status = condition ? 'PASS' : 'FAIL';
  console.log(`[${status}] ${label}`);
  if (!condition) process.exitCode = 1;
}

console.log('=== FAKTU — Extracteur d\'intention (règles) — exécution réelle ===\n');

console.log('--- Cas 1 (section 5) : facture complète avec échéance ---');
const r1 = extractIntent('Fais une facture à Mamadou pour 20 sacs de ciment à 6 500 francs, payable dans 15 jours.');
console.log(JSON.stringify(r1, null, 2));
assert(r1.intent === 'CREATE_INVOICE', 'intent = CREATE_INVOICE');
assert(r1.entities.customer_query === 'Mamadou', 'client = Mamadou');
assert(r1.entities.items[0].quantity === 20, 'quantité = 20');
assert(r1.entities.items[0].product_query === 'ciment', 'produit = ciment');
assert(r1.entities.items[0].unit_price === 6500, 'prix = 6500');
assert(r1.entities.due_in_days === 15, 'échéance = 15 jours');
assert(r1.requires_clarification === false, 'pas de clarification nécessaire');

console.log('\n--- Cas 2 (section 6) : facture SANS quantité -> clarification obligatoire ---');
const r2 = extractIntent('Fais une facture à Mamadou pour du ciment.');
console.log(JSON.stringify(r2, null, 2));
assert(r2.requires_clarification === true, 'clarification demandée (jamais d\'invention)');
assert(!!r2.clarification_question, 'question de clarification fournie');

console.log('\n--- Cas 3 (section 14) : achat avec fournisseur ---');
const r3 = extractIntent("J'ai acheté 100 sacs de ciment à 4 800 francs chez Sénégal Matériaux.");
console.log(JSON.stringify(r3, null, 2));
assert(r3.intent === 'CREATE_PURCHASE', 'intent = CREATE_PURCHASE');
assert(r3.entities.quantity === 100, 'quantité = 100');
assert(r3.entities.unit_price === 4800, 'prix = 4800');
assert(r3.entities.supplier_query === 'Sénégal Matériaux', 'fournisseur = Sénégal Matériaux');

console.log('\n--- Cas 4 (section 16) : dépense ---');
const r4 = extractIntent('Enregistre 15 000 francs de carburant aujourd\'hui.');
console.log(JSON.stringify(r4, null, 2));
assert(r4.intent === 'CREATE_EXPENSE', 'intent = CREATE_EXPENSE');
assert(r4.entities.amount === 15000, 'montant = 15000');
assert(r4.entities.category === 'carburant', 'catégorie = carburant');
assert(r4.entities.date === 'today', 'date = aujourd\'hui');

console.log('\n--- Cas 5 (section 20) : mode conversationnel ---');
const r5 = extractIntent('Comment va mon commerce ?');
console.log(JSON.stringify(r5, null, 2));
assert(r5.intent === 'GET_REPORT', 'intent = GET_REPORT');

console.log('\n--- Cas 6 : phrase non reconnue -> jamais d\'invention ---');
const r6 = extractIntent('Quel temps fait-il à Thiès ?');
console.log(JSON.stringify(r6, null, 2));
assert(r6.intent === 'UNKNOWN', 'intent = UNKNOWN (honnête plutôt que faux positif)');
assert(r6.requires_clarification === true, 'demande de reformulation');

console.log('\n=== Fin des tests ===');
console.log(process.exitCode === 1 ? '\n>>> AU MOINS UN TEST A ÉCHOUÉ <<<' : '\n>>> TOUS LES TESTS SONT PASSÉS <<<');

module.exports = { extractIntent };

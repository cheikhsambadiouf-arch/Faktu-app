
// ai/index.js — Point d'entrée unique de la couche IA de FAKTU.
//
// C'est le SEUL fichier qui sait quel fournisseur est actif (via la
// variable d'environnement AI_PROVIDER). Le reste de FAKTU (assistant.js)
// ne connaît que understand(text, previousIntent) -> intent structuré —
// jamais Anthropic, OpenAI, Gemini ou Mistral directement.
//
// Changer de fournisseur = changer AI_PROVIDER sur Render, rien d'autre.

const anthropic = require('./providers/anthropic');
const openai = require('./providers/openai');
const gemini = require('./providers/gemini');
const mistral = require('./providers/mistral');

const PROVIDERS = { anthropic, openai, gemini, mistral };
const DEFAULT_PROVIDER = 'anthropic';

function getActiveProvider() {
  const name = (process.env.AI_PROVIDER || DEFAULT_PROVIDER).toLowerCase().trim();
  const provider = PROVIDERS[name];
  if (!provider) {
    const e = new Error(`Fournisseur IA inconnu : "${name}". Valeurs possibles : ${Object.keys(PROVIDERS).join(', ')}.`);
    e.status = 500;
    throw e;
  }
  return provider;
}

function isConfigured() {
  try {
    const provider = getActiveProvider();
    return !!process.env[provider.envKey];
  } catch (e) {
    return false;
  }
}

// Prompt système partagé par tous les fournisseurs — décrit les actions
// FAKTU disponibles. Ajouter une action ici ET dans ai/actions.js ; les deux
// listes doivent rester alignées, mais rien d'autre dans le code ne dépend
// du fournisseur choisi.
const SYSTEM_PROMPT = `Tu es le moteur de compréhension de FAKTU, une application de gestion commerciale pour des commerçants au Sénégal. Un commerçant t'écrit une phrase naturelle en français (parfois mêlée de wolof) et tu dois en extraire une intention structurée, en JSON strict, sans aucun texte autour.

Devise : francs CFA (FCFA / XOF). Comprends toutes les façons d'exprimer un nombre : "12 500", "12500", "douze mille cinq cents", "12 mille", "25 mille" (=25000), "mille" (=1000), etc.

Actions possibles (champ "action") :
- "create_sale" : une vente directe (paiement généralement immédiat ou à la livraison). parameters: { customer_name, items: [{ product, quantity, unit (ex: "sac", "bouteille", peut être vide), unit_price }] }
- "create_invoice" : une facture formelle à envoyer à un client (paiement différé, montant global ou détaillé). parameters: { customer_name, amount (si un seul montant global est donné), items (si détaillé, même forme que create_sale) }
- "get_daily_sales" : consulter les ventes du jour. parameters: {}
- "get_customer_balance" : consulter ce qu'un client doit encore (factures/ventes impayées). parameters: { customer_name }
- "update_stock" : ajouter une quantité au stock d'un produit. parameters: { product, quantity }
- "send_invoice_whatsapp" : envoyer une facture ou vente déjà existante à un client par WhatsApp. parameters: { customer_name, document_number (si précisé, ex: "FAC-2026-0003") }
- "needs_clarification" : il manque une information indispensable (jamais inventer une valeur manquante — prix, quantité, produit, client, montant). parameters: {}, plus "missing_field" et "clarification_question" (question courte et naturelle).
- "unknown" : la phrase ne correspond à aucune action ci-dessus, ou demande une action sensible non prévue (ex: "supprime toutes mes ventes").

Règle absolue : si une information nécessaire manque, réponds avec "needs_clarification" — n'invente jamais une valeur.

Si un contexte précédent (intention partielle déjà commencée) est fourni, complète-le avec la nouvelle information du message plutôt que de repartir de zéro.

Réponds uniquement avec un objet JSON de cette forme, rien d'autre :
{"action": "...", "parameters": {...}, "missing_field": "...", "clarification_question": "..."}`;

function extractIntentFromRawText(rawText) {
  let intent;
  try {
    const cleaned = rawText.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
    intent = JSON.parse(cleaned);
  } catch (e) {
    console.error('[ai] Réponse IA non-JSON:', rawText.slice(0, 300));
    return { action: 'unknown', parameters: {} };
  }
  if (!intent || typeof intent !== 'object' || !intent.action) {
    return { action: 'unknown', parameters: {} };
  }
  intent.parameters = intent.parameters || {};
  return intent;
}

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

// Un 503 (surcharge momentanée) ou 429 (limite de débit) est presque
// toujours temporaire — quelques secondes plus tard, ça repasse. Toute
// autre erreur (mauvaise clé, requête invalide) échouerait de la même
// façon à chaque tentative, donc on ne réessaie jamais dans ce cas.
const RETRIABLE_STATUSES = [503, 429];
const RETRY_DELAYS_MS = [1000, 2500];

async function understand(text, previousIntent) {
  const provider = getActiveProvider();
  const apiKey = process.env[provider.envKey];
  if (!apiKey) {
    const e = new Error(`Assistant non configuré : la variable ${provider.envKey} est absente sur ce serveur`);
    e.status = 503;
    throw e;
  }

  const userContent = previousIntent
    ? `Intention en cours (à compléter avec le nouveau message) : ${JSON.stringify(previousIntent)}\n\nNouveau message du commerçant : "${text}"`
    : `Message du commerçant : "${text}"`;

  let lastError;
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    try {
      const rawText = await provider.understand({ apiKey, systemPrompt: SYSTEM_PROMPT, userContent });
      return extractIntentFromRawText(rawText);
    } catch (e) {
      lastError = e;
      const providerStatus = Number((e.message.match(/error (\d{3})/) || [])[1]) || e.status;
      const isRetriable = RETRIABLE_STATUSES.includes(providerStatus);
      if (!isRetriable || attempt === RETRY_DELAYS_MS.length) throw e;
      console.warn(`[ai] Tentative ${attempt + 1} échouée (${providerStatus}), nouvel essai dans ${RETRY_DELAYS_MS[attempt]}ms...`);
      await sleep(RETRY_DELAYS_MS[attempt]);
    }
  }
  throw lastError;
}

module.exports = { understand, isConfigured, getActiveProvider, extractIntentFromRawText, PROVIDERS };

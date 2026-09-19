// assistant.js — « Parler à FAKTU » : comprend une demande écrite (puis
// vocale plus tard) et la transforme en action réelle dans l'application.
//
// Architecture stricte (voir la demande d'origine) :
//   Utilisateur -> IA (comprend le langage) -> Intent structuré
//               -> Backend (recherche client/produit réels, validation)
//               -> Logique métier FAKTU déjà existante -> Base de données
// L'IA ne touche JAMAIS la base de données directement — elle ne fait que
// comprendre une phrase et en extraire une intention structurée.

const db = require('./db');
const { getOrCreateCompany } = require('./companies');
const { createSaleForCompany } = require('./sales');

// ===== Abstraction du fournisseur IA =====
// Un seul point de contact avec le fournisseur — le remplacer plus tard
// (autre modèle, autre fournisseur) ne touche qu'à cette fonction, jamais
// au reste de la logique FAKTU. Même principe prévu pour le Speech-to-Text
// quand il sera ajouté (une fonction équivalente, isolée pareillement).
function isAssistantConfigured() {
  return !!process.env.ANTHROPIC_API_KEY;
}

const SYSTEM_PROMPT = `Tu es le moteur de compréhension de FAKTU, une application de gestion commerciale pour des commerçants au Sénégal. Un commerçant t'écrit une phrase naturelle en français (parfois mêlée de wolof) et tu dois en extraire une intention structurée, en JSON strict, sans aucun texte autour.

Devise : francs CFA (FCFA / XOF). Comprends toutes les façons d'exprimer un nombre : "12 500", "12500", "douze mille cinq cents", "12 mille", "25 mille" (=25000), "mille" (=1000), etc.

Actions possibles (champ "action") :
- "create_sale" : une vente. parameters: { customer_name, items: [{ product, quantity, unit (ex: "sac", "bouteille", peut être vide), unit_price }] }
- "get_today_sales" : consulter les ventes du jour. parameters: {}
- "get_stock" : consulter un stock. parameters: { product }
- "add_stock" : ajouter du stock. parameters: { product, quantity }
- "record_payment" : enregistrer un paiement reçu. parameters: { customer_name, amount }
- "get_customer_balance" : consulter ce qu'un client doit. parameters: { customer_name }
- "create_reminder" : créer un rappel. parameters: { customer_name (optionnel), task, date }
- "needs_clarification" : il manque une information indispensable pour comprendre la demande (jamais inventer une valeur manquante — prix, quantité, produit, client). parameters: {}, plus "missing_field" (le nom du champ manquant) et "clarification_question" (une question courte et naturelle à poser).
- "unknown" : la phrase ne correspond à aucune action ci-dessus, ou demande une action sensible non prévue (ex: "supprime toutes mes ventes").

Règle absolue : si une information nécessaire manque (prix, quantité, produit, ou montant selon l'action), réponds avec "needs_clarification" — n'invente jamais une valeur.

Si un contexte précédent (intention partielle déjà commencée) est fourni, complète-le avec la nouvelle information du message plutôt que de repartir de zéro.

Réponds uniquement avec un objet JSON de cette forme, rien d'autre :
{"action": "...", "parameters": {...}, "missing_field": "...", "clarification_question": "..."}`;

async function parseUserIntent(text, previousIntent) {
  if (!isAssistantConfigured()) {
    const e = new Error('Assistant non configuré sur ce serveur');
    e.status = 503;
    throw e;
  }

  const userContent = previousIntent
    ? `Intention en cours (à compléter avec le nouveau message) : ${JSON.stringify(previousIntent)}\n\nNouveau message du commerçant : "${text}"`
    : `Message du commerçant : "${text}"`;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-5',
      max_tokens: 700,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userContent }]
    })
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => '');
    console.error('[Assistant] Erreur API IA:', res.status, errBody.slice(0, 300));
    const e = new Error('Le service de compréhension est momentanément indisponible');
    e.status = 502;
    throw e;
  }

  const data = await res.json();
  const rawText = (data.content || []).map(b => b.text || '').join('').trim();

  let intent;
  try {
    // Retire un éventuel habillage ```json ... ``` que le modèle ajoute parfois.
    const cleaned = rawText.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
    intent = JSON.parse(cleaned);
  } catch (e) {
    console.error('[Assistant] Réponse IA non-JSON:', rawText.slice(0, 300));
    return { action: 'unknown', parameters: {} };
  }
  if (!intent || typeof intent !== 'object' || !intent.action) {
    return { action: 'unknown', parameters: {} };
  }
  intent.parameters = intent.parameters || {};
  return intent;
}

// ===== Recherche des clients/produits réels — jamais fait par l'IA elle-même =====
// Ne choisit jamais arbitrairement en cas d'ambiguïté : remonte la liste des
// correspondances pour que le commerçant tranche.
function findMatchingClients(companyId, name) {
  if (!name) return [];
  const needle = name.trim().toLowerCase();
  if (!needle) return [];
  return db.prepare('SELECT * FROM clients WHERE company_id = ? AND deleted = 0 AND LOWER(name) LIKE ?')
    .all(companyId, `%${needle}%`);
}

// ===== Traduction d'un intent confirmé vers une action réelle =====
// C'est ici, et seulement ici, que l'intent touche la vraie logique métier
// FAKTU déjà existante (jamais l'IA directement).
async function executeIntent(user, intent) {
  const company = getOrCreateCompany(user.id);

  if (intent.action === 'create_sale') {
    const p = intent.parameters;
    const items = (p.items || []).map(it => ({
      description: it.unit ? `${it.unit} de ${it.product}` : it.product,
      qty: Number(it.quantity) || 1,
      unit_price: Number(it.unit_price) || 0
    }));
    const sale = createSaleForCompany(company, {
      client_name: p.customer_name,
      client_phone: p.customer_phone,
      items
    });
    const total = items.reduce((s, it) => s + it.qty * it.unit_price, 0);
    return {
      ok: true,
      message: `C'est fait 👍 ${items.map(it => it.description).join(', ')} vendu${items.length > 1 ? 's' : ''} à ${p.customer_name} pour ${fmtFcfa(total)}.`,
      sale
    };
  }

  if (intent.action === 'get_today_sales') {
    const today = new Date().toISOString().slice(0, 10);
    const rows = db.prepare('SELECT * FROM sales WHERE company_id = ? AND deleted = 0 AND date = ?').all(company.id, today);
    const total = rows.reduce((sum, s) => {
      const items = db.prepare('SELECT qty, unit_price FROM sale_items WHERE sale_id = ?').all(s.id);
      return sum + items.reduce((x, it) => x + it.qty * it.unit_price, 0);
    }, 0);
    return {
      ok: true,
      message: rows.length
        ? `Aujourd'hui, tu as fait ${rows.length} vente${rows.length > 1 ? 's' : ''} pour ${fmtFcfa(total)}.`
        : `Aucune vente enregistrée aujourd'hui pour l'instant.`
    };
  }

  const e = new Error('Action non prise en charge pour le moment');
  e.status = 400;
  throw e;
}

function fmtFcfa(n) {
  return Math.round(n || 0).toLocaleString('fr-FR') + ' FCFA';
}

// ===== Route : comprendre un message (sans encore rien exécuter) =====
async function handleAssistantParse(req, res, { json, user, body }) {
  const company = getOrCreateCompany(user.id);
  const text = (body.text || '').trim();
  if (!text) return json(res, 400, { message: 'Message vide' });

  let intent;
  try {
    intent = await parseUserIntent(text, body.previous_intent || null);
  } catch (e) {
    return json(res, e.status || 500, { message: e.message });
  }

  if (intent.action === 'needs_clarification' || intent.action === 'unknown') {
    return json(res, 200, { intent });
  }

  // Recherche des vrais clients pour create_sale / record_payment / get_customer_balance —
  // jamais choisi arbitrairement en cas d'ambiguïté.
  const nameField = intent.parameters.customer_name;
  if (nameField) {
    const matches = findMatchingClients(company.id, nameField);
    if (matches.length > 1) {
      return json(res, 200, {
        intent: {
          action: 'needs_clarification',
          parameters: intent.parameters,
          missing_field: 'customer_disambiguation',
          clarification_question: `J'ai trouvé ${matches.length} clients qui correspondent à "${nameField}". Lequel veux-tu dire ?`,
          candidates: matches.map(c => ({ id: c.id, name: c.name, phone: c.phone }))
        }
      });
    }
    if (matches.length === 1) {
      intent.parameters.customer_phone = matches[0].phone;
      intent.parameters.matched_client_id = matches[0].id;
    }
  }

  // Vente : sans client connu, il faut au moins un numéro de téléphone —
  // jamais inventé, donc demandé si absent.
  if (intent.action === 'create_sale' && !intent.parameters.customer_phone) {
    return json(res, 200, {
      intent: {
        action: 'needs_clarification',
        parameters: intent.parameters,
        missing_field: 'customer_phone',
        clarification_question: `Je ne connais pas encore ${intent.parameters.customer_name || 'ce client'}. Quel est son numéro de téléphone ?`
      }
    });
  }

  json(res, 200, { intent });
}

// ===== Route : exécuter un intent déjà confirmé par le commerçant =====
async function handleAssistantExecute(req, res, { json, user, body }) {
  const intent = body.intent;
  if (!intent || !intent.action) return json(res, 400, { message: 'Intention manquante' });
  try {
    const result = await executeIntent(user, intent);
    json(res, 200, result);
  } catch (e) {
    json(res, e.status || 500, { message: e.message || 'Erreur serveur' });
  }
}

module.exports = { handleAssistantParse, handleAssistantExecute, isAssistantConfigured, parseUserIntent, executeIntent };

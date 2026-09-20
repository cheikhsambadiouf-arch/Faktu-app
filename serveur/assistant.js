// assistant.js — « Parler à FAKTU », orchestrateur.
//
// Architecture (voir ai/index.js et ai/actions.js) :
//   Vendeur -> ai.understand() [fournisseur interchangeable] -> intent
//           -> recherche des vrais clients (ici, jamais dans l'IA)
//           -> confirmation par le vendeur (côté app)
//           -> ai/actions.js exécute réellement via la logique métier FAKTU
// Ce fichier ne connaît ni Anthropic, ni OpenAI, ni aucun fournisseur —
// seulement l'interface commune exposée par ./ai.

const db = require('./db');
const { getOrCreateCompany } = require('./companies');
const ai = require('./ai');
const { ACTIONS } = require('./ai/actions');

// Ne choisit jamais arbitrairement en cas d'ambiguïté — remonte la liste des
// correspondances pour que le vendeur tranche lui-même.
function findMatchingClients(companyId, name) {
  if (!name) return [];
  const needle = name.trim().toLowerCase();
  if (!needle) return [];
  return db.prepare('SELECT * FROM clients WHERE company_id = ? AND deleted = 0 AND LOWER(name) LIKE ?')
    .all(companyId, `%${needle}%`);
}

function clarify(parameters, missingField, question, extra) {
  return { action: 'needs_clarification', parameters, missing_field: missingField, clarification_question: question, ...extra };
}

// ===== Route : comprendre un message (sans encore rien exécuter) =====
async function handleAssistantParse(req, res, { json, user, body }) {
  const company = getOrCreateCompany(user.id);
  const text = (body.text || '').trim();
  if (!text) return json(res, 400, { message: 'Message vide' });

  let intent;
  try {
    intent = await ai.understand(text, body.previous_intent || null);
  } catch (e) {
    return json(res, e.status || 500, { message: e.message });
  }

  if (intent.action === 'needs_clarification' || intent.action === 'unknown') {
    return json(res, 200, { intent });
  }

  const actionDef = ACTIONS[intent.action];
  if (!actionDef) {
    // L'IA a proposé une action que FAKTU ne sait pas exécuter — jamais
    // planter, toujours répondre proprement.
    return json(res, 200, { intent: { action: 'unknown', parameters: intent.parameters } });
  }

  // Recherche des vrais clients — jamais fait par l'IA, jamais choisi
  // arbitrairement en cas d'ambiguïté.
  const name = intent.parameters.customer_name;
  if (actionDef.requiresCustomer && name) {
    const matches = findMatchingClients(company.id, name);
    if (matches.length > 1) {
      return json(res, 200, {
        intent: clarify(intent.parameters, 'customer_disambiguation',
          `J'ai trouvé ${matches.length} clients qui correspondent à "${name}". Lequel veux-tu dire ?`,
          { candidates: matches.map(c => ({ id: c.id, name: c.name, phone: c.phone })), __originalAction: intent.action })
      });
    }
    if (matches.length === 1) {
      intent.parameters.customer_phone = matches[0].phone;
      intent.parameters.matched_client_id = matches[0].id;
    }
  }

  // Vente directe : sans client connu, il faut au moins un numéro de
  // téléphone — jamais inventé, donc demandé si absent (une facture, elle,
  // n'a pas cette contrainte : voir invoices.js).
  if (intent.action === 'create_sale' && !intent.parameters.customer_phone) {
    return json(res, 200, {
      intent: clarify(intent.parameters, 'customer_phone', `Je ne connais pas encore ${name || 'ce client'}. Quel est son numéro de téléphone ?`)
    });
  }

  json(res, 200, { intent });
}

// ===== Route : exécuter un intent déjà confirmé par le vendeur =====
async function handleAssistantExecute(req, res, { json, user, body }) {
  const intent = body.intent;
  if (!intent || !intent.action) return json(res, 400, { message: 'Intention manquante' });

  const actionDef = ACTIONS[intent.action];
  if (!actionDef) return json(res, 400, { message: 'Action non prise en charge pour le moment' });

  const company = getOrCreateCompany(user.id);
  const baseUrl = `https://${req.headers.host}`;

  try {
    const result = actionDef.execute(company, intent.parameters || {}, { baseUrl });
    json(res, 200, { ok: true, message: result.message, data: result.data || null });
  } catch (e) {
    json(res, e.status || 500, { message: e.message || 'Erreur serveur' });
  }
}

module.exports = { handleAssistantParse, handleAssistantExecute };

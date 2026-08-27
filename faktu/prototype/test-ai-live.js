#!/usr/bin/env node
'use strict';

/**
 * FAKTU — Test EN CONDITIONS RÉELLES du moteur IA (ai.service.ts).
 *
 * À LANCER SUR TA MACHINE (pas dans un environnement sans réseau).
 * La clé API n'est JAMAIS écrite dans ce fichier ni envoyée nulle part
 * d'autre qu'au fournisseur IA choisi — elle reste uniquement dans ta
 * variable d'environnement locale.
 *
 * USAGE :
 *
 *   Anthropic :
 *     export AI_PROVIDER=anthropic
 *     export AI_API_KEY=sk-ant-...
 *     export AI_MODEL=claude-sonnet-4-6        # optionnel
 *     node prototype/test-ai-live.js "Fais une facture à Mamadou pour 20 sacs de ciment à 6500 francs"
 *
 *   OpenAI :
 *     export AI_PROVIDER=openai
 *     export AI_API_KEY=sk-...
 *     export AI_MODEL=gpt-4o-mini              # optionnel
 *     node prototype/test-ai-live.js "Fais une facture à Mamadou pour 20 sacs de ciment à 6500 francs"
 *
 * Nécessite Node.js 18+ (fetch natif). Vérifie avec `node -v`.
 */

const SYSTEM_PROMPT = `Tu es le moteur d'interprétation d'intention de FAKTU, un assistant de
gestion commerciale pour des commerçants au Sénégal. L'utilisateur te parle
en français courant (parfois mélangé de wolof). Tu dois extraire une
intention structurée à partir de sa phrase.

Réponds UNIQUEMENT avec un objet JSON, sans texte autour, au format exact :
{
  "intent": "CREATE_CUSTOMER" | "CREATE_PRODUCT" | "CREATE_INVOICE" | "SEARCH_INVOICE" |
            "RECORD_PAYMENT" | "CREATE_EXPENSE" | "CREATE_PURCHASE" | "GET_REPORT" |
            "GET_CUSTOMER_BALANCE" | "GET_SUPPLIER_BALANCE" | "UNKNOWN",
  "confidence": <0..1>,
  "requires_clarification": <bool>,
  "clarification_question": "<uniquement si requires_clarification=true>",
  "entities": { ... }
}

RÈGLE ABSOLUE : si une information nécessaire (quantité, prix, client...)
manque ou est ambiguë, tu ne dois JAMAIS l'inventer. Mets
requires_clarification à true et pose la question exacte à poser au
commerçant, en français, comme le ferait un assistant humain poli.`;

function stripJsonFences(text) {
  return text.replace(/```json/gi, '').replace(/```/g, '').trim();
}

async function callAnthropic(apiKey, model, transcript) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: model || 'claude-sonnet-4-6',
      max_tokens: 500,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: transcript }],
    }),
  });
  if (!response.ok) {
    throw new Error(`Anthropic API ${response.status} : ${await response.text()}`);
  }
  const data = await response.json();
  const text = data.content?.find((b) => b.type === 'text')?.text ?? '{}';
  return JSON.parse(stripJsonFences(text));
}

async function callOpenAi(apiKey, model, transcript) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model || 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: transcript },
      ],
    }),
  });
  if (!response.ok) {
    throw new Error(`OpenAI API ${response.status} : ${await response.text()}`);
  }
  const data = await response.json();
  const text = data.choices?.[0]?.message?.content ?? '{}';
  return JSON.parse(stripJsonFences(text));
}

async function main() {
  const provider = process.env.AI_PROVIDER;
  const apiKey = process.env.AI_API_KEY;
  const model = process.env.AI_MODEL;
  const transcript = process.argv.slice(2).join(' ') ||
    'Fais une facture à Mamadou pour 20 sacs de ciment à 6 500 francs, payable dans 15 jours.';

  if (!provider || !apiKey) {
    console.error('❌ Variables manquantes. Il faut définir AI_PROVIDER et AI_API_KEY.');
    console.error('   Exemple : export AI_PROVIDER=anthropic && export AI_API_KEY=sk-ant-...');
    process.exit(1);
  }

  console.log(`Fournisseur : ${provider}`);
  console.log(`Phrase testée : "${transcript}"\n`);

  try {
    const result =
      provider === 'anthropic'
        ? await callAnthropic(apiKey, model, transcript)
        : provider === 'openai'
        ? await callOpenAi(apiKey, model, transcript)
        : (() => { throw new Error(`AI_PROVIDER inconnu : ${provider} (attendu: anthropic | openai)`); })();

    console.log('✅ Réponse reçue :\n');
    console.log(JSON.stringify(result, null, 2));

    // Vérifications basiques de forme (pas une garantie de justesse sémantique)
    const checks = [
      ['intent est présent', typeof result.intent === 'string'],
      ['confidence est un nombre', typeof result.confidence === 'number'],
      ['requires_clarification est un booléen', typeof result.requires_clarification === 'boolean'],
      ['entities est un objet', typeof result.entities === 'object'],
    ];
    console.log('\n--- Vérifications de forme ---');
    for (const [label, ok] of checks) {
      console.log(`[${ok ? 'PASS' : 'FAIL'}] ${label}`);
    }
  } catch (err) {
    console.error('❌ Échec de l\'appel IA :', err.message);
    process.exit(1);
  }
}

main();

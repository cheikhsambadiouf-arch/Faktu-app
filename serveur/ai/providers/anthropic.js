
// ai/providers/anthropic.js — Fournisseur Anthropic (Claude).
//
// Contrat commun à TOUS les fournisseurs (voir ai/index.js) :
//   async function understand({ apiKey, systemPrompt, userContent }) -> string
// Reçoit un prompt système + le message de l'utilisateur, renvoie le texte
// brut produit par le modèle. Tout le reste (extraction du JSON, validation,
// logique métier) est géré ailleurs, jamais ici — ce fichier ne sait parler
// qu'à l'API Anthropic, rien d'autre.

const MODEL = 'claude-sonnet-5';

async function understand({ apiKey, systemPrompt, userContent }) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 700,
      system: systemPrompt,
      messages: [{ role: 'user', content: userContent }]
    })
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => '');
    const e = new Error(`Anthropic API error ${res.status}: ${errBody.slice(0, 300)}`);
    e.status = 502;
    throw e;
  }

  const data = await res.json();
  return (data.content || []).map(b => b.text || '').join('').trim();
}

module.exports = { understand, name: 'anthropic', envKey: 'ANTHROPIC_API_KEY' };

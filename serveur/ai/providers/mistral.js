
// ai/providers/mistral.js — Fournisseur Mistral.
// Même contrat que les autres fournisseurs (voir ai/index.js) :
//   async function understand({ apiKey, systemPrompt, userContent }) -> string

// Mistral maintient un alias "-latest" qui pointe toujours vers leur modèle
// courant de cette gamme — un choix par défaut raisonnablement pérenne,
// mais tout de même reconfigurable via MISTRAL_MODEL si besoin.
const DEFAULT_MODEL = 'mistral-small-latest';

async function understand({ apiKey, systemPrompt, userContent }) {
  const model = process.env.MISTRAL_MODEL || DEFAULT_MODEL;
  const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      max_tokens: 700,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent }
      ]
    })
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => '');
    const e = new Error(`Mistral API error ${res.status}: ${errBody.slice(0, 300)}`);
    e.status = 502;
    throw e;
  }

  const data = await res.json();
  return (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content || '').trim();
}

module.exports = { understand, name: 'mistral', envKey: 'MISTRAL_API_KEY' };

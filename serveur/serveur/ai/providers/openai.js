
// ai/providers/openai.js — Fournisseur OpenAI (GPT).
// Même contrat que les autres fournisseurs (voir ai/index.js) :
//   async function understand({ apiKey, systemPrompt, userContent }) -> string

// Le nom du modèle est configurable (OPENAI_MODEL) plutôt que figé en dur —
// les fournisseurs renomment leurs modèles régulièrement ; changer de
// version ne doit jamais exiger de modifier ce fichier.
const DEFAULT_MODEL = 'gpt-4o-mini';

async function understand({ apiKey, systemPrompt, userContent }) {
  const model = process.env.OPENAI_MODEL || DEFAULT_MODEL;
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      max_tokens: 700,
      response_format: { type: 'json_object' }, // force une sortie JSON valide côté OpenAI
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent }
      ]
    })
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => '');
    const e = new Error(`OpenAI API error ${res.status}: ${errBody.slice(0, 300)}`);
    e.status = 502;
    throw e;
  }

  const data = await res.json();
  return (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content || '').trim();
}

module.exports = { understand, name: 'openai', envKey: 'OPENAI_API_KEY' };

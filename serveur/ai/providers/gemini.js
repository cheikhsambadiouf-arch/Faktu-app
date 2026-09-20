
// ai/providers/gemini.js — Fournisseur Google Gemini.
// Même contrat que les autres fournisseurs (voir ai/index.js) :
//   async function understand({ apiKey, systemPrompt, userContent }) -> string

const DEFAULT_MODEL = 'gemini-3.6-flash';

async function understand({ apiKey, systemPrompt, userContent }) {
  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      // Gemini n'a pas de rôle "system" dédié dans ce format simple — on le
      // fait précéder comme instruction système explicite via systemInstruction.
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: 'user', parts: [{ text: userContent }] }],
      generationConfig: { maxOutputTokens: 700, responseMimeType: 'application/json' }
    })
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => '');
    const e = new Error(`Gemini API error ${res.status}: ${errBody.slice(0, 300)}`);
    e.status = 502;
    throw e;
  }

  const data = await res.json();
  const parts = (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) || [];
  return parts.map(p => p.text || '').join('').trim();
}

module.exports = { understand, name: 'gemini', envKey: 'GEMINI_API_KEY' };

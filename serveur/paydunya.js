// paydunya.js — Intégration PayDunya (Payment With Redistribution / PAR).
// Donne au client final un vrai choix de moyen de paiement (Wave, Orange
// Money, Free Money, carte bancaire...) hébergé par PayDunya elle-même,
// entièrement indépendant de ce que le vendeur a configuré dans FAKTU, avec
// confirmation automatique du paiement via IPN — pas de bouton "J'ai payé"
// à confirmer manuellement sur ce chemin-là.

const crypto = require('crypto');

const MODE = process.env.PAYDUNYA_MODE === 'live' ? 'live' : 'test';
const BASE_URL = MODE === 'live'
  ? 'https://app.paydunya.com/api/v1'
  : 'https://app.paydunya.com/sandbox-api/v1';

function isConfigured() {
  return !!(process.env.PAYDUNYA_MASTER_KEY && process.env.PAYDUNYA_PRIVATE_KEY && process.env.PAYDUNYA_TOKEN);
}

function headers() {
  return {
    'Content-Type': 'application/json',
    'PAYDUNYA-MASTER-KEY': process.env.PAYDUNYA_MASTER_KEY,
    'PAYDUNYA-PRIVATE-KEY': process.env.PAYDUNYA_PRIVATE_KEY,
    'PAYDUNYA-TOKEN': process.env.PAYDUNYA_TOKEN
  };
}

async function createCheckout({ companyName, totalAmount, description, items, publicToken, ipnUrl, returnUrl }) {
  const body = {
    invoice: {
      total_amount: Math.round(totalAmount),
      description: description || 'Commande FAKTU',
      items: (items || []).reduce((acc, it, i) => {
        acc['item_' + i] = {
          name: it.description, quantity: it.qty, unit_price: String(it.unit_price),
          total_price: String(Math.round(it.qty * it.unit_price))
        };
        return acc;
      }, {}),
      custom_data: { order_token: publicToken },
      actions: { callback_url: ipnUrl, return_url: returnUrl }
    },
    store: { name: companyName || 'FAKTU' }
  };

  const res = await fetch(`${BASE_URL}/checkout-invoice/create`, {
    method: 'POST', headers: headers(), body: JSON.stringify(body)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.response_code !== '00') {
    throw new Error(data.response_text || 'Échec de création du paiement PayDunya');
  }
  return { url: data.response_text, token: data.token };
}

function verifyHash(receivedHash) {
  if (!process.env.PAYDUNYA_MASTER_KEY) return false;
  const expected = crypto.createHash('sha512').update(process.env.PAYDUNYA_MASTER_KEY).digest('hex');
  return receivedHash === expected;
}

// Interroge PayDunya directement pour savoir si une facture a réellement été
// payée — utilisé en complément (voire en remplacement, si l'IPN ne nous
// parvient pas de façon fiable) de la notification automatique : on vérifie
// nous-mêmes plutôt que d'attendre passivement.
async function confirmInvoice(invoiceToken) {
  const res = await fetch(`${BASE_URL}/checkout-invoice/confirm/${invoiceToken}`, {
    method: 'GET', headers: headers()
  });
  const data = await res.json().catch(() => ({}));
  return data;
}

module.exports = { isConfigured, createCheckout, verifyHash, confirmInvoice, MODE };

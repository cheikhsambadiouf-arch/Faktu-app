// html-utils.js — Utilitaires partagés par les pages HTML publiques
// (public-page.js, delivery-page.js, store-page.js).

// Sérialise une valeur en JSON pour l'injecter sans risque dans un
// <script> inline. JSON.stringify seul n'échappe pas "<" : une valeur
// contrôlée par l'utilisateur (le token/slug pris depuis l'URL) peut donc
// contenir "</script><script>...</script>" et fermer prématurément la
// balise, injectant du HTML/JS arbitraire (XSS réfléchie) — exploitable
// avant même que la page n'appelle l'API, sur n'importe quel visiteur à
// qui on envoie un lien piégé. On échappe donc "<", ">" et les séparateurs
// de ligne Unicode (U+2028/U+2029) que JSON autorise mais que certains
// moteurs JS interprètent comme des fins de ligne.
const LINE_SEPARATOR = String.fromCharCode(0x2028);
const PARAGRAPH_SEPARATOR = String.fromCharCode(0x2029);

function safeJsonForScript(value) {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .split(LINE_SEPARATOR).join('\\u2028')
    .split(PARAGRAPH_SEPARATOR).join('\\u2029');
}

module.exports = { safeJsonForScript };

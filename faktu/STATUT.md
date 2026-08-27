# FAKTU — Statut réel du projet

Ce document distingue, comme l'exige le prompt maître (section "Distingue toujours") :
**1. spécifié · 2. codé · 3. testé · 4. déployé**

## 1. Spécifié ✅
Cahier des charges complet (docs/product, docs/architecture) — rien n'a été retiré ni simplifié.

## 2. Codé
| Composant | État |
|---|---|
| Migration SQL V001 (schéma complet) | ✅ codé — ⚠️ jamais exécuté contre un vrai PostgreSQL |
| Seed de démonstration | ✅ codé — ⚠️ jamais exécuté |
| API NestJS — clients, produits | ✅ codé — ⚠️ jamais exécuté (pas de `npm install` possible ici) |
| API NestJS — factures (preview/confirm, boucle centrale) | ✅ codé — ⚠️ jamais exécuté |
| API NestJS — paiements (partiel, total, doublon, dépassement) | ✅ codé — ⚠️ jamais exécuté |
| Authentification (FAKTU-003) | ❌ pas codée — `x-business-id` en header est un raccourci temporaire, pas sécurisé |
| App mobile Flutter — écran saisie + prévisualisation + confirmation | ✅ codé — ⚠️ jamais compilé |
| **IA — extracteur de secours (règles/regex, hors ligne)** | ✅ codé et **réellement testé** (voir section 3) |
| **IA — moteur LLM (Anthropic/OpenAI) avec repli automatique** | ✅ codé — ⚠️ appel réseau jamais testé (pas d'accès réseau ici) |
| **Voix — transcription (Whisper API)** | ✅ codé — ⚠️ jamais testé (pas d'accès réseau, pas de fichier audio réel) |
| **Orchestrateur `/assistant/command`** (voix → IA → preview) | ✅ codé — ⚠️ jamais exécuté de bout en bout |
| App mobile — saisie vocale (micro réel côté téléphone) | ✅ codé (`speech_to_text` embarqué + repli texte) — ⚠️ jamais compilé ni exécuté sur appareil. Nécessite `flutter create .` puis permissions natives — voir `apps/mobile/PERMISSIONS.md` |
| Achats, fournisseurs, dépenses, dashboard, relances | ❌ pas codés (P1, hors vertical slice) |

## 3. Testé
| Élément | État |
|---|---|
| **Logique métier de la boucle centrale** (calcul, décrément stock, statuts, paiement partiel/total, doublon, dépassement) | ✅ **réellement testé** — voir `prototype/vertical-slice-demo.js`, exécuté avec succès (10/10 assertions PASS) |
| **Extraction d'intention en français** (facture, achat, dépense, rapport, clarification) | ✅ **réellement testé** — voir `prototype/intent-extractor-demo.js`, exécuté avec succès (6 scénarios, tous PASS) |
| Le code NestJS/PostgreSQL réel (API) | ❌ non testé — impossible sans base de données ni accès réseau dans cet environnement |
| L'appel réseau au LLM (Anthropic/OpenAI) et à Whisper (STT) | ❌ non testé par moi — nécessite une vraie clé API et un accès réseau, absents ici. **Script prêt pour que tu testes toi-même en local** : `prototype/test-ai-live.js` |
| L'app mobile Flutter réelle | ❌ non testée — impossible sans SDK Flutter ni appareil |

Autrement dit : **la logique est validée**, mais **le code de production n'a jamais tourné**. Il doit être testé par toi (ou un développeur) avant toute mise en production.

## 4. Déployé
❌ Rien n'est déployé. Aucun serveur, aucune base de données réelle, aucune app publiée.

---

## Ce qui manque réellement pour arriver sur le Play Store

Ce sont des étapes que **je ne peux pas exécuter à ta place** — elles demandent ton identité, ton argent, ou un vrai environnement de développement :

1. **Installer un vrai environnement** : Flutter SDK, Node.js, Docker, sur ton ordinateur (ou celui d'un développeur).
2. **Faire tourner et corriger le code** : `npm install` dans `apps/api`, `docker-compose up`, lancer les migrations, lancer `flutter pub get` puis `flutter run` — il y aura presque certainement des bugs à corriger, c'est normal pour du code jamais exécuté.
3. **Écrire la reconnaissance vocale + IA réelle** (STT + interprétation d'intention) — actuellement non codée, c'est la pièce la plus complexe du produit.
4. **Héberger l'API** quelque part (Render, Railway, VPS chez un hébergeur) avec une vraie base PostgreSQL.
5. **Sécuriser** : authentification réelle (actuellement absente), HTTPS, gestion des secrets.
6. **Créer un compte développeur Google Play** (25 $, une fois), générer une clé de signature, remplir la fiche (icône, captures d'écran, politique de confidentialité — obligatoire).
7. **Tester avec de vrais utilisateurs** (section 42 — pilote terrain, 10 à 20 commerçants).
8. **Soumettre à la revue Google Play** (délai de quelques jours, hors de mon contrôle).

Je peux t'accompagner sur chacune de ces étapes (t'expliquer les commandes, t'aider à déboguer, écrire le module vocal/IA, rédiger la politique de confidentialité, etc.) — mais je ne peux pas les exécuter moi-même depuis cette conversation.

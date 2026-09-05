# FAKTU — Backend (Phase 1 : Auth · Phase 2 : Entreprise/Clients · Phase 3 : Produits/Factures/Ventes/Livreurs)

## Ce qui existe aujourd'hui

Un serveur Node.js **sans aucune dépendance externe** (pas de `npm install` requis) :
- `http` natif pour le serveur web
- `node:sqlite` natif pour la base de données (persistante, fichier `faktu.db`)
- `crypto` natif pour le hachage des mots de passe (scrypt) et les jetons de session signés (HMAC)

### Authentification (Phase 1)
- `POST /api/auth/register` — `{ name, phone, email?, password }` → `{ token, user }`
- `POST /api/auth/login` — `{ phone, password }` → `{ token, user }`
- `GET /api/auth/me` — header `Authorization: Bearer <token>` → `{ user }`

### Entreprise (Phase 2)
- `GET /api/company` — retourne l'entreprise de l'utilisateur connecté (créée automatiquement et vide au premier appel)
- `PUT /api/company` — met à jour les champs fournis (`name`, `phone`, `address`, `tva_rate`, `currency_name`, etc.)

### Clients (Phase 2)
- `GET /api/clients` / `POST /api/clients` / `PUT /api/clients/:id` / `DELETE /api/clients/:id` (suppression douce)

### Produits (Phase 3)
- `GET /api/products` / `POST /api/products` / `PUT /api/products/:id` / `DELETE /api/products/:id`

### Livreurs (Phase 3)
- `GET /api/drivers` / `POST /api/drivers` / `DELETE /api/drivers/:id`

### Factures / Proformas / Bons (Phase 3)
- `GET /api/invoices` — liste avec totaux calculés
- `GET /api/invoices/:id` — détail avec articles
- `POST /api/invoices` — `{ type, client_id? | client_name, date?, due_date?, subject?, discount_pct?, tva_rate?, items:[{description,qty,unit_price}] }`
- `POST /api/invoices/:id/payment` — `{ amount, method?, ref? }` (cumulatif, statut `partiel`/`paye` automatique)
- `POST /api/invoices/:id/driver` — `{ driver_id }`
- `POST /api/invoices/:id/delivered`
- `DELETE /api/invoices/:id` (suppression douce)

### Vente Directe (Phase 3)
- Mêmes routes que les factures, sous `/api/sales`, avec `client_name`/`client_phone`/`client_address` au lieu de `client_id`

Toutes les routes ci-dessus (hors `/api/auth/*`) exigent `Authorization: Bearer <token>`.

- `GET /health` — vérification simple

## Sécurité déjà en place

- Mots de passe hachés (scrypt + sel aléatoire par utilisateur), jamais stockés en clair
- Jetons de session signés et à expiration (30 jours), impossibles à falsifier sans le secret serveur
- Anti-bruteforce : 5 tentatives échouées → verrouillage de 60 secondes
- **Isolation stricte entre entreprises**, vérifiée par des tests contradictoires réels (pas de simple relecture) sur factures, produits, ventes, livreurs et références croisées — un utilisateur B ne peut jamais lire, modifier, payer, livrer ou référencer les données de l'entreprise d'un utilisateur A (toujours 404, jamais 200 ni fuite d'information)
- **Les totaux (sous-total, TVA, total) sont toujours recalculés côté serveur** à partir des lignes d'articles — un total falsifié envoyé par le frontend est purement et simplement ignoré (testé : envoyer `"total":1` sur une commande de 118 000 F n'a aucun effet, le vrai total est renvoyé)
- **Numérotation atomique** par entreprise et par type de document (`F-`, `PF-`, `BC-`, `BL-`, `VTE-`), garantie sans doublon même en cas de requêtes simultanées (`INSERT ... ON CONFLICT ... RETURNING`, testé)
- CORS activé pour que l'app web puisse appeler ce serveur depuis un autre domaine

**Testé en réel** à chaque phase, avec l'exemple exact du cahier des charges (Sac de riz 25kg + Huile végétale, TVA 18% → 22 420 F) qui tombe juste au centime près.

## Ce qui n'est PAS encore fait

- Modification d'une facture existante (changer ses lignes après création) — seule la création, le paiement, l'assignation de livreur et la suppression sont couverts pour l'instant
- Dashboard agrégé côté serveur (les statistiques restent calculées côté app pour le moment)
- Rate limiting global (l'anti-bruteforce ne couvre que la connexion, pas les autres routes)



## ⚠️ Avant tout déploiement réel

1. **`node:sqlite` est expérimental** (disponible à partir de Node 22.5+). Si votre hébergeur propose une version de Node plus ancienne, remplacez `node:sqlite` par le paquet npm `better-sqlite3` — l'API est presque identique (`db.prepare(...).get()/.run()/.all()`), il suffit de changer l'import en haut de `db.js`.
2. **Définissez `TOKEN_SECRET`** — une chaîne longue et aléatoire, différente de la valeur de développement. Sans ça, n'importe qui pourrait forger de faux jetons de session.
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
3. **Le fichier `faktu.db`** doit être sur un disque persistant (pas un stockage éphémère) — sur la plupart des hébergeurs gratuits/serverless, le disque est effacé à chaque redéploiement. Vérifiez ce point avec votre hébergeur, ou passez à une vraie base hébergée (Postgres) si besoin.

## Démarrer en local

```bash
cd server
PORT=3000 TOKEN_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))") node index.js
```

## Déployer sur Railway (recommandé)

**Pourquoi Railway et pas Render :** vérifié en septembre 2026 — l'offre gratuite de Render n'autorise **aucun disque persistant** sur les web services (le fichier `faktu.db` serait effacé à chaque redémarrage/redéploiement). Railway propose un disque persistant (« Volume ») dès l'offre Hobby (5 $/mois, avec un essai gratuit de 30 jours à l'inscription). Tout se fait dans le navigateur — aucun terminal requis.

### Étapes

1. **Poussez le dossier `server/`** sur votre dépôt GitHub (`cheikhsambadiouf-arch/Faktu` ou équivalent). Vous pouvez le faire directement depuis l'interface web de GitHub (bouton "Add file" → "Upload files") si vous n'avez pas de terminal sous la main.

2. **Créez un compte sur [railway.com](https://railway.com)** (connexion possible avec votre compte GitHub directement).

3. **New Project → Deploy from GitHub repo**, choisissez votre dépôt.
   - Si `server/` n'est pas à la racine du dépôt, réglez **Root Directory** sur `server` dans les paramètres du service (onglet Settings).
   - Railway détecte automatiquement Node.js et utilise `npm start` (déjà défini dans `package.json` → `node index.js`). Aucune configuration de build nécessaire.

4. **Ajoutez un Volume** (disque persistant) :
   - Dans le service, onglet **Volumes** → **New Volume**
   - Point de montage : `/data`

5. **Variables d'environnement** (onglet **Variables**) :
   ```
   TOKEN_SECRET = 4fd19ebe003a17af53971728e8d316d8376cdb1f7cc976b71fd3506c8893f6d2
   DB_PATH = /data/faktu.db
   ```
   ⚠️ Le `TOKEN_SECRET` ci-dessus a été généré aléatoirement pour vous — utilisez-le tel quel, ou générez le vôtre avec la commande suivante (n'importe où où Node est installé) :
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

6. **Déployez.** Railway construit et démarre le service automatiquement. Une fois prêt, allez dans l'onglet **Settings** → **Networking** → **Generate Domain** pour obtenir une URL publique du type `https://faktu-production.up.railway.app`.

7. **Vérifiez que ça fonctionne** : ouvrez `https://votre-url.up.railway.app/health` dans un navigateur — vous devez voir `{"status":"ok"}`.

⚠️ **Point de vigilance sur la version de Node** : `node:sqlite` exige Node 22.5 ou plus récent. J'ai ajouté un fichier `nixpacks.toml` (déjà dans ce dossier) qui force Railway à utiliser Node 22 — mais je n'ai pas pu tester ce déploiement moi-même (pas d'accès réseau ici), et des utilisateurs de Railway rapportent parfois que la version de Node demandée est ignorée par leur système de build. **Vérifiez les logs de build** après le premier déploiement : la ligne `setup` doit mentionner `nodejs_22` (ou une version ≥ 22.5). Si Railway utilise quand même une version trop ancienne : allez dans **Settings → Build → Builder** et remplacez "Nixpacks" par "**Railpack**", qui respecte plus fiablement la version demandée d'après les retours d'utilisateurs récents.

### Connecter l'app FAKTU à ce serveur

Dans le fichier `faktu.html`, cherchez cette ligne (tout au début du `<script>`) :
```js
const API_BASE_URL = '';
```
Remplacez-la par votre URL Railway (sans slash à la fin) :
```js
const API_BASE_URL = 'https://faktu-production.up.railway.app';
```
Enregistrez le fichier — c'est tout, l'app se connecte automatiquement au serveur au prochain lancement.

### Alternative : Render (si vous préférez, avec surcoût)

Possible aussi, mais il faut l'offre payante Starter (7 $/mois) + un disque persistant (0,25 $/Go/mois) pour que les données survivent aux redémarrages — l'offre gratuite les effacerait. Les étapes sont similaires (connecter le dépôt GitHub, définir `TOKEN_SECRET`), avec en plus l'ajout d'un "Persistent Disk" dans les paramètres du service.

## Autres notes de déploiement

## Prochaine étape

Une fois ce serveur déployé et son URL connue :
1. Renseigner `API_BASE_URL` dans l'app FAKTU (déjà prévu, ligne dédiée dans le fichier HTML)
2. Faire basculer progressivement l'app d'un stockage local vers des appels à cette API, sans casser le fonctionnement hors-ligne existant
3. Compléter les points listés dans "Ce qui n'est pas encore fait" ci-dessus selon les besoins réels observés

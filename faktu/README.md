# FAKTU

**Assistant intelligent de gestion commerciale.**
« Parlez. FAKTU fait le reste. »

Marché initial : Sénégal. Extension : Afrique francophone.

## Statut du projet

📋 **Spécifié** — cahier des charges complet (voir `docs/product`)
🚧 **En cours de développement** — squelette du repository créé (ÉTAPE 1)
⬜ **Codé** — à venir (ÉTAPE 3 et suivantes)
⬜ **Testé** — à venir
⬜ **Déployé** — à venir

## Structure du repository

```
faktu/
├── apps/
│   ├── mobile/     # App Flutter (commerçants)
│   ├── api/         # Backend NestJS
│   └── web/          # Web / back-office (non prioritaire MVP)
├── packages/
│   ├── types/         # Types partagés
│   ├── validation/     # Règles de validation métier
│   └── config/          # Configuration partagée
├── database/
│   ├── migrations/  # Schéma SQL PostgreSQL
│   └── seeds/         # Données de démonstration
├── docs/
│   ├── product/       # Vision, cibles, exemples officiels
│   ├── architecture/  # Stack, ERD, architecture IA, RBAC
│   ├── api/             # Documentation des endpoints
│   └── ux/               # Parcours utilisateur
├── .github/workflows/  # CI/CD
├── .env.example
├── docker-compose.yml   # (sera créé à l'ÉTAPE 2)
└── README.md
```

## Boucle centrale

🎙️ Parler → 🧠 Comprendre → 🔎 Vérifier → 🧾 Prévisualiser →
✅ Confirmer → ⚙️ Exécuter → 📄 Générer → 📤 Partager → 📚 Archiver

## Prochaines étapes

- ÉTAPE 2 : `docker-compose.yml` (PostgreSQL, Redis, API)
- ÉTAPE 3 : API NestJS
- ÉTAPE 4 : Migration PostgreSQL V001
- ÉTAPE 5 : Seeds (Boutique Test FAKTU, Mamadou Ndiaye, Ciment 50 kg)
- ÉTAPE 6 : Premiers endpoints
- ÉTAPE 7 : Tests
- ÉTAPE 8 : Vertical slice complète

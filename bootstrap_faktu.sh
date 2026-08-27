#!/usr/bin/env bash
set -e
echo "Reconstruction du projet FAKTU..."
mkdir -p "faktu"
cat > "faktu/.env.example" << 'FAKTU_EOF_MARKER_9f3a'
# ==========================
# FAKTU - Variables d'environnement (exemple)
# Copier ce fichier en .env et remplir les vraies valeurs.
# Ne JAMAIS committer le fichier .env réel.
# ==========================

DATABASE_URL=postgresql://faktu:faktu@localhost:5432/faktu
REDIS_URL=redis://localhost:6379

JWT_SECRET=change_me
JWT_REFRESH_SECRET=change_me_too

AI_PROVIDER=anthropic
AI_API_KEY=
AI_MODEL=

STORAGE_ENDPOINT=
STORAGE_BUCKET=
STORAGE_ACCESS_KEY=
STORAGE_SECRET_KEY=
FAKTU_EOF_MARKER_9f3a
cat > "faktu/.gitignore" << 'FAKTU_EOF_MARKER_9f3a'
# Dependencies
node_modules/
.pnp
.pnp.js

# Env
.env
.env.local

# Build
dist/
build/
.next/
*.tsbuildinfo

# Flutter
apps/mobile/.dart_tool/
apps/mobile/.flutter-plugins
apps/mobile/.flutter-plugins-dependencies
apps/mobile/build/

# Logs
*.log
npm-debug.log*

# OS
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/
FAKTU_EOF_MARKER_9f3a
cat > "faktu/README.md" << 'FAKTU_EOF_MARKER_9f3a'
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
FAKTU_EOF_MARKER_9f3a
cat > "faktu/STATUT.md" << 'FAKTU_EOF_MARKER_9f3a'
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
FAKTU_EOF_MARKER_9f3a
cat > "faktu/docker-compose.yml" << 'FAKTU_EOF_MARKER_9f3a'
version: "3.9"

services:
  postgres:
    image: postgres:16-alpine
    container_name: faktu_postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: faktu
      POSTGRES_PASSWORD: faktu
      POSTGRES_DB: faktu
    ports:
      - "5432:5432"
    volumes:
      - faktu_pg_data:/var/lib/postgresql/data
      - ./database/migrations:/docker-entrypoint-initdb.d/migrations
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U faktu"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: faktu_redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5

  api:
    build:
      context: ./apps/api
    container_name: faktu_api
    restart: unless-stopped
    env_file:
      - .env
    environment:
      DATABASE_URL: postgresql://faktu:faktu@postgres:5432/faktu
      REDIS_URL: redis://redis:6379
    ports:
      - "3000:3000"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    volumes:
      - ./apps/api:/app
      - /app/node_modules

volumes:
  faktu_pg_data:
FAKTU_EOF_MARKER_9f3a
mkdir -p "faktu/.github/workflows"
cat > "faktu/.github/workflows/README.md" << 'FAKTU_EOF_MARKER_9f3a'
# .github/workflows

Pipelines CI/CD (GitHub Actions) : tests automatiques, build, déploiement.
Sera rempli à partir du SPRINT 0 / FAKTU-090.
FAKTU_EOF_MARKER_9f3a
mkdir -p "faktu/apps/api"
cat > "faktu/apps/api/README.md" << 'FAKTU_EOF_MARKER_9f3a'
# apps/api

Backend FAKTU (NestJS / TypeScript).
Contient l'API REST, le moteur métier (validation, calculs, transactions),
la connexion PostgreSQL/Redis, et la passerelle vers l'IA.

Statut : dossier vide, sera initialisé à l'ÉTAPE 3.
FAKTU_EOF_MARKER_9f3a
cat > "faktu/apps/api/nest-cli.json" << 'FAKTU_EOF_MARKER_9f3a'
{
  "$schema": "https://json.schemastore.org/nest-cli",
  "collection": "@nestjs/schematics",
  "sourceRoot": "src"
}
FAKTU_EOF_MARKER_9f3a
cat > "faktu/apps/api/package.json" << 'FAKTU_EOF_MARKER_9f3a'
{
  "name": "@faktu/api",
  "version": "0.1.0",
  "description": "Backend FAKTU (NestJS)",
  "private": true,
  "scripts": {
    "build": "nest build",
    "start": "nest start",
    "start:dev": "nest start --watch",
    "test": "jest",
    "test:e2e": "jest --config ./test/jest-e2e.json"
  },
  "dependencies": {
    "@nestjs/common": "^10.4.0",
    "@nestjs/core": "^10.4.0",
    "@nestjs/platform-express": "^10.4.0",
    "class-transformer": "^0.5.1",
    "class-validator": "^0.14.1",
    "pg": "^8.12.0",
    "reflect-metadata": "^0.2.2",
    "rxjs": "^7.8.1"
  },
  "devDependencies": {
    "@nestjs/cli": "^10.4.5",
    "@nestjs/testing": "^10.4.0",
    "@types/express": "^4.17.21",
    "@types/jest": "^29.5.12",
    "@types/node": "^20.14.0",
    "@types/pg": "^8.11.6",
    "@types/supertest": "^6.0.2",
    "jest": "^29.7.0",
    "supertest": "^7.0.0",
    "ts-jest": "^29.2.5",
    "ts-node": "^10.9.2",
    "typescript": "^5.5.4"
  },
  "jest": {
    "rootDir": "src",
    "testRegex": ".*\\.spec\\.ts$",
    "transform": { "^.+\\.(t|j)s$": "ts-jest" }
  }
}
FAKTU_EOF_MARKER_9f3a
cat > "faktu/apps/api/tsconfig.json" << 'FAKTU_EOF_MARKER_9f3a'
{
  "compilerOptions": {
    "module": "commonjs",
    "target": "ES2021",
    "lib": ["ES2021"],
    "declaration": false,
    "removeComments": true,
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "sourceMap": true,
    "outDir": "./dist",
    "baseUrl": "./",
    "incremental": true,
    "skipLibCheck": true,
    "strictNullChecks": true,
    "noImplicitAny": false,
    "strictBindCallApply": false,
    "forceConsistentCasingInFileNames": true,
    "esModuleInterop": true
  }
}
FAKTU_EOF_MARKER_9f3a
mkdir -p "faktu/apps/api/src"
cat > "faktu/apps/api/src/app.module.ts" << 'FAKTU_EOF_MARKER_9f3a'
import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { CustomersModule } from './customers/customers.module';
import { ProductsModule } from './products/products.module';
import { InvoicesModule } from './invoices/invoices.module';
import { PaymentsModule } from './payments/payments.module';
import { AiModule } from './ai/ai.module';
import { VoiceModule } from './voice/voice.module';
import { AssistantModule } from './assistant/assistant.module';

@Module({
  imports: [
    DatabaseModule,
    CustomersModule,
    ProductsModule,
    InvoicesModule,
    PaymentsModule,
    AiModule,
    VoiceModule,
    AssistantModule,
  ],
})
export class AppModule {}
FAKTU_EOF_MARKER_9f3a
cat > "faktu/apps/api/src/main.ts" << 'FAKTU_EOF_MARKER_9f3a'
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.setGlobalPrefix('api/v1');
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`FAKTU API démarrée sur le port ${port}`);
}
bootstrap();
FAKTU_EOF_MARKER_9f3a
mkdir -p "faktu/apps/api/src/ai"
cat > "faktu/apps/api/src/ai/ai.controller.ts" << 'FAKTU_EOF_MARKER_9f3a'
import { Body, Controller, Post } from '@nestjs/common';
import { AiService } from './ai.service';
import { InterpretDto } from './dto/interpret.dto';

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('interpret')
  interpret(@Body() dto: InterpretDto) {
    return this.aiService.interpret(dto.transcript);
  }
}
FAKTU_EOF_MARKER_9f3a
cat > "faktu/apps/api/src/ai/ai.module.ts" << 'FAKTU_EOF_MARKER_9f3a'
import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { NluFallbackService } from './nlu-fallback.service';

@Module({
  controllers: [AiController],
  providers: [AiService, NluFallbackService],
  exports: [AiService],
})
export class AiModule {}
FAKTU_EOF_MARKER_9f3a
cat > "faktu/apps/api/src/ai/ai.service.ts" << 'FAKTU_EOF_MARKER_9f3a'
import { Injectable, Logger } from '@nestjs/common';
import { InterpretedIntent } from './intent.types';
import { NluFallbackService } from './nlu-fallback.service';

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

/**
 * Moteur d'interprétation d'intention.
 *
 * IMPORTANT — HONNÊTETÉ SUR CE QUI EST TESTÉ :
 * L'appel réseau vers le fournisseur IA (AI_PROVIDER / AI_API_KEY) n'a
 * PAS pu être exécuté ni testé dans cet environnement de développement
 * (pas d'accès réseau sortant). Le code est écrit pour être correct
 * selon la documentation standard d'un appel "chat completion", mais
 * DOIT être testé avec une vraie clé API avant toute mise en service.
 *
 * En attant (ou en cas d'échec de l'appel IA — panne, quota, hors ligne),
 * le service bascule automatiquement sur NluFallbackService, qui LUI a
 * été testé (voir STATUT.md). Cette bascule garantit que FAKTU reste
 * utilisable même si le LLM externe ne répond pas — conformément à la
 * section 35 (offline) du prompt maître.
 */
@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(private readonly fallback: NluFallbackService) {}

  async interpret(transcript: string): Promise<InterpretedIntent> {
    const apiKey = process.env.AI_API_KEY;
    const provider = process.env.AI_PROVIDER;

    if (!apiKey || !provider) {
      this.logger.warn('AI_API_KEY/AI_PROVIDER non configurés — utilisation du moteur de secours (règles).');
      return this.fallback.interpret(transcript);
    }

    try {
      const parsed = await this.callLlm(provider, apiKey, transcript);
      return { ...parsed, source: 'llm' };
    } catch (err) {
      this.logger.error(`Appel IA échoué, repli sur les règles : ${err}`);
      return this.fallback.interpret(transcript);
    }
  }

  private async callLlm(provider: string, apiKey: string, transcript: string): Promise<Omit<InterpretedIntent, 'source'>> {
    if (provider === 'anthropic') {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: process.env.AI_MODEL || 'claude-sonnet-4-6',
          max_tokens: 500,
          system: SYSTEM_PROMPT,
          messages: [{ role: 'user', content: transcript }],
        }),
      });
      if (!response.ok) throw new Error(`Anthropic API ${response.status}`);
      const data: any = await response.json();
      const text = data.content?.find((b: any) => b.type === 'text')?.text ?? '{}';
      return JSON.parse(this.stripJsonFences(text));
    }

    if (provider === 'openai') {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: process.env.AI_MODEL || 'gpt-4o-mini',
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: transcript },
          ],
        }),
      });
      if (!response.ok) throw new Error(`OpenAI API ${response.status}`);
      const data: any = await response.json();
      const text = data.choices?.[0]?.message?.content ?? '{}';
      return JSON.parse(this.stripJsonFences(text));
    }

    throw new Error(`AI_PROVIDER inconnu : ${provider}`);
  }

  private stripJsonFences(text: string): string {
    return text.replace(/```json/gi, '').replace(/```/g, '').trim();
  }
}
FAKTU_EOF_MARKER_9f3a
cat > "faktu/apps/api/src/ai/intent.types.ts" << 'FAKTU_EOF_MARKER_9f3a'
export type FaktuIntent =
  | 'CREATE_CUSTOMER'
  | 'CREATE_PRODUCT'
  | 'CREATE_INVOICE'
  | 'SEARCH_INVOICE'
  | 'RECORD_PAYMENT'
  | 'CREATE_EXPENSE'
  | 'CREATE_PURCHASE'
  | 'GET_REPORT'
  | 'GET_CUSTOMER_BALANCE'
  | 'GET_SUPPLIER_BALANCE'
  | 'UNKNOWN';

export interface InterpretedIntent {
  intent: FaktuIntent;
  confidence: number; // 0..1
  requires_clarification: boolean;
  clarification_question?: string;
  entities: Record<string, any>;
  source: 'llm' | 'fallback_rules'; // pour audit : quel moteur a répondu
}
FAKTU_EOF_MARKER_9f3a
cat > "faktu/apps/api/src/ai/nlu-fallback.service.ts" << 'FAKTU_EOF_MARKER_9f3a'
import { Injectable } from '@nestjs/common';
import { InterpretedIntent } from './intent.types';

/**
 * Port TypeScript FIDÈLE de prototype/intent-extractor-demo.js.
 * Ce dernier a été RÉELLEMENT EXÉCUTÉ et validé (6 scénarios, tous PASS)
 * — voir STATUT.md. Ce fichier reproduit exactement la même logique,
 * champ par champ, pour que la garantie de comportement obtenue par le
 * test s'applique aussi ici. Il n'a pas été ré-exécuté séparément dans
 * ce format NestJS (pas de runtime TypeScript disponible dans cet
 * environnement) — à vérifier avec `npm test` avant mise en service.
 *
 * RÔLE : filet de sécurité quand le LLM (AiService) est indisponible
 * (hors ligne, panne, clé API absente) — voir section 35 du prompt
 * maître. Ne devine jamais une valeur manquante (section 6 / 45).
 */
@Injectable()
export class NluFallbackService {
  private parseAmount(raw: string): number | null {
    const cleaned = raw.replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
    const value = parseFloat(cleaned);
    return Number.isFinite(value) ? value : null;
  }

  interpret(transcript: string): InterpretedIntent {
    const text = transcript.trim();

    const invoiceMatch = text.match(/facture\s+(?:à|a)\s+(.+?)\s+pour\s+(.+)/i);
    if (invoiceMatch) {
      const customer = invoiceMatch[1].trim();
      let rest = invoiceMatch[2].trim();

      let dueInDays: number | null = null;
      const dueMatch = rest.match(/,?\s*payable\s+dans\s+(\d+)\s+jours?/i);
      if (dueMatch) {
        dueInDays = parseInt(dueMatch[1], 10);
        rest = rest.replace(dueMatch[0], '').trim();
      }

      const lineMatch = rest.match(
        /(\d+(?:[.,]\d+)?)\s+([a-zàâçéèêëîïôûùüÿñæœ]+)\s+de\s+(.+?)\s+(?:à|a)\s+([\d\s.,]+)\s*(?:francs?|fcfa|f)\b/i,
      );

      if (lineMatch) {
        return {
          intent: 'CREATE_INVOICE',
          confidence: 0.9,
          requires_clarification: false,
          source: 'fallback_rules',
          entities: {
            customer_query: customer,
            items: [
              {
                product_query: lineMatch[3].trim().replace(/\.$/, ''),
                quantity: this.parseAmount(lineMatch[1]),
                unit: lineMatch[2],
                unit_price: this.parseAmount(lineMatch[4]),
              },
            ],
            due_in_days: dueInDays,
          },
        };
      }

      const productOnlyMatch =
        rest.match(/pour\s+(?:du|de la|des|de l['’])\s*(.+)/i) || rest.match(/^(.+)$/);
      const productGuess = (productOnlyMatch ? productOnlyMatch[1] : rest).replace(/[.?!]+$/, '').trim();

      return {
        intent: 'CREATE_INVOICE',
        confidence: 0.5,
        requires_clarification: true,
        clarification_question: `Combien de ${productGuess} souhaitez-vous facturer ?`,
        source: 'fallback_rules',
        entities: { customer_query: customer, product_query: productGuess },
      };
    }

    const purchaseMatch = text.match(
      /achet[ée]\s+(\d+(?:[.,]\d+)?)\s+([a-zàâçéèêëîïôûùüÿñæœ]+)\s+de\s+(.+?)\s+(?:à|a)\s+([\d\s.,]+)\s*(?:francs?|fcfa|f)\b(?:\s+chez\s+(.+))?/i,
    );
    if (purchaseMatch) {
      const supplierRaw = purchaseMatch[5] ? purchaseMatch[5].replace(/[.?!]+$/, '').trim() : null;
      return {
        intent: 'CREATE_PURCHASE',
        confidence: supplierRaw ? 0.9 : 0.7,
        requires_clarification: !supplierRaw,
        clarification_question: supplierRaw ? undefined : 'Chez quel fournisseur avez-vous acheté ?',
        source: 'fallback_rules',
        entities: {
          product_query: purchaseMatch[3].trim(),
          quantity: this.parseAmount(purchaseMatch[1]),
          unit: purchaseMatch[2],
          unit_price: this.parseAmount(purchaseMatch[4]),
          supplier_query: supplierRaw,
        },
      };
    }

    const expenseMatch = text.match(
      /enregistre\s+([\d\s.,]+)\s*(?:francs?|fcfa|f)\s+de\s+([a-zàâçéèêëîïôûùüÿñæœ]+)/i,
    );
    if (expenseMatch) {
      const isToday = /aujourd['’]hui/i.test(text);
      return {
        intent: 'CREATE_EXPENSE',
        confidence: 0.85,
        requires_clarification: false,
        source: 'fallback_rules',
        entities: {
          amount: this.parseAmount(expenseMatch[1]),
          category: expenseMatch[2],
          date: isToday ? 'today' : null,
        },
      };
    }

    if (/comment\s+va\s+mon\s+commerce/i.test(text) || /^rapport\b/i.test(text)) {
      return {
        intent: 'GET_REPORT',
        confidence: 0.8,
        requires_clarification: false,
        source: 'fallback_rules',
        entities: {},
      };
    }

    return {
      intent: 'UNKNOWN',
      confidence: 0,
      requires_clarification: true,
      clarification_question: "Je n'ai pas compris. Pouvez-vous reformuler ?",
      source: 'fallback_rules',
      entities: {},
    };
  }
}
FAKTU_EOF_MARKER_9f3a
mkdir -p "faktu/apps/api/src/ai/dto"
cat > "faktu/apps/api/src/ai/dto/interpret.dto.ts" << 'FAKTU_EOF_MARKER_9f3a'
import { IsNotEmpty, IsString } from 'class-validator';

export class InterpretDto {
  @IsString()
  @IsNotEmpty()
  transcript: string;
}
FAKTU_EOF_MARKER_9f3a
mkdir -p "faktu/apps/api/src/assistant"
cat > "faktu/apps/api/src/assistant/assistant.controller.ts" << 'FAKTU_EOF_MARKER_9f3a'
import { Body, Controller, Post } from '@nestjs/common';
import { VoiceService } from '../voice/voice.service';
import { AiService } from '../ai/ai.service';
import { InvoicesService } from '../invoices/invoices.service';
import { BusinessId } from '../common/business.decorator';
import { AssistantCommandDto } from './dto/assistant-command.dto';

/**
 * Point d'entrée unique de la boucle centrale (section 4) côté voix :
 *
 *   🎙️ audio -> 🧠 transcription -> 🧠 intent -> 🔎 résolution -> 🧾 preview
 *
 * Ce contrôleur COMPOSE les modules déjà construits — il ne réimplémente
 * aucune logique métier. Si l'intention nécessite une clarification
 * (ambiguïté, donnée manquante), on la retourne directement : la
 * confirmation/exécution reste sur POST /invoices (déjà existant),
 * jamais automatique — conformément à la règle "l'IA n'a jamais seule
 * l'autorité finale sur une opération financière sensible" (section 2).
 */
@Controller('assistant')
export class AssistantController {
  constructor(
    private readonly voiceService: VoiceService,
    private readonly aiService: AiService,
    private readonly invoicesService: InvoicesService,
  ) {}

  @Post('command')
  async command(@BusinessId() businessId: string, @Body() dto: AssistantCommandDto) {
    // 1. Transcription (si audio fourni) ou texte direct (mode texte / tests)
    const transcript = dto.transcript ?? (await this.voiceService.transcribe(dto.audio_base64!, dto.mime_type!)).transcript;

    // 2. Compréhension
    const interpreted = await this.aiService.interpret(transcript);

    if (interpreted.requires_clarification || interpreted.intent === 'UNKNOWN') {
      return {
        step: 'CLARIFICATION_NEEDED',
        transcript,
        intent: interpreted.intent,
        clarification_question: interpreted.clarification_question,
        entities: interpreted.entities,
      };
    }

    // 3. Routage vers l'action métier correspondante.
    // Seul CREATE_INVOICE est câblé pour l'instant (vertical slice) ;
    // les autres intentions sont reconnues mais pas encore exécutées.
    if (interpreted.intent === 'CREATE_INVOICE') {
      const preview = await this.invoicesService.preview(businessId, {
        customer_query: interpreted.entities.customer_query,
        items: interpreted.entities.items,
        due_in_days: interpreted.entities.due_in_days ?? undefined,
      });
      return { step: 'PREVIEW_READY', transcript, intent: interpreted.intent, preview };
    }

    return {
      step: 'INTENT_NOT_YET_WIRED',
      transcript,
      intent: interpreted.intent,
      entities: interpreted.entities,
      message: `L'intention "${interpreted.intent}" est reconnue mais pas encore reliée à une action (hors du vertical slice initial).`,
    };
  }
}
FAKTU_EOF_MARKER_9f3a
cat > "faktu/apps/api/src/assistant/assistant.module.ts" << 'FAKTU_EOF_MARKER_9f3a'
import { Module } from '@nestjs/common';
import { AssistantController } from './assistant.controller';
import { VoiceModule } from '../voice/voice.module';
import { AiModule } from '../ai/ai.module';
import { InvoicesModule } from '../invoices/invoices.module';

@Module({
  imports: [VoiceModule, AiModule, InvoicesModule],
  controllers: [AssistantController],
})
export class AssistantModule {}
FAKTU_EOF_MARKER_9f3a
mkdir -p "faktu/apps/api/src/assistant/dto"
cat > "faktu/apps/api/src/assistant/dto/assistant-command.dto.ts" << 'FAKTU_EOF_MARKER_9f3a'
import { IsOptional, IsString } from 'class-validator';

export class AssistantCommandDto {
  // Option A (recommandée pour tester sans micro) : texte direct
  @IsOptional()
  @IsString()
  transcript?: string;

  // Option B : audio brut, transcrit côté serveur
  @IsOptional()
  @IsString()
  audio_base64?: string;

  @IsOptional()
  @IsString()
  mime_type?: string;
}
FAKTU_EOF_MARKER_9f3a
mkdir -p "faktu/apps/api/src/common"
cat > "faktu/apps/api/src/common/business.decorator.ts" << 'FAKTU_EOF_MARKER_9f3a'
import { createParamDecorator, ExecutionContext, BadRequestException } from '@nestjs/common';

/**
 * FAKTU isole toutes les données par business_id (multi-tenant).
 * Pour ce vertical slice (sans auth complète), le business_id est lu
 * depuis un header explicite. Quand l'authentification (FAKTU-003)
 * sera branchée, ce décorateur lira le business_id depuis le token
 * JWT plutôt que depuis un header — c'est un TODO volontaire.
 */
export const BusinessId = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    const businessId = request.headers['x-business-id'];
    if (!businessId) {
      throw new BadRequestException('Header x-business-id requis');
    }
    return businessId;
  },
);
FAKTU_EOF_MARKER_9f3a
mkdir -p "faktu/apps/api/src/customers"
cat > "faktu/apps/api/src/customers/customers.controller.ts" << 'FAKTU_EOF_MARKER_9f3a'
import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { BusinessId } from '../common/business.decorator';

@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post()
  create(@BusinessId() businessId: string, @Body() dto: CreateCustomerDto) {
    return this.customersService.create(businessId, dto);
  }

  @Get()
  findAll(@BusinessId() businessId: string, @Query('search') search?: string) {
    return this.customersService.findAll(businessId, search);
  }

  @Get(':id')
  findOne(@BusinessId() businessId: string, @Param('id') id: string) {
    return this.customersService.findOne(businessId, id);
  }
}
FAKTU_EOF_MARKER_9f3a
cat > "faktu/apps/api/src/customers/customers.module.ts" << 'FAKTU_EOF_MARKER_9f3a'
import { Module } from '@nestjs/common';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';

@Module({
  controllers: [CustomersController],
  providers: [CustomersService],
  exports: [CustomersService],
})
export class CustomersModule {}
FAKTU_EOF_MARKER_9f3a
cat > "faktu/apps/api/src/customers/customers.service.ts" << 'FAKTU_EOF_MARKER_9f3a'
import { Injectable, NotFoundException } from '@nestjs/common';
import { PgService } from '../database/pg.service';
import { CreateCustomerDto } from './dto/create-customer.dto';

@Injectable()
export class CustomersService {
  constructor(private readonly pg: PgService) {}

  async create(businessId: string, dto: CreateCustomerDto) {
    const { rows } = await this.pg.query(
      `INSERT INTO customers (business_id, name, phone, notes, credit_limit)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [businessId, dto.name, dto.phone ?? null, dto.notes ?? null, dto.credit_limit ?? null],
    );
    return rows[0];
  }

  async findAll(businessId: string, search?: string) {
    if (search) {
      const { rows } = await this.pg.query(
        `SELECT * FROM customers
         WHERE business_id = $1 AND name ILIKE '%' || $2 || '%'
         ORDER BY name ASC`,
        [businessId, search],
      );
      return rows;
    }
    const { rows } = await this.pg.query(
      `SELECT * FROM customers WHERE business_id = $1 ORDER BY name ASC`,
      [businessId],
    );
    return rows;
  }

  async findOne(businessId: string, id: string) {
    const { rows } = await this.pg.query(
      `SELECT * FROM customers WHERE business_id = $1 AND id = $2`,
      [businessId, id],
    );
    if (!rows[0]) throw new NotFoundException('Client introuvable');
    return rows[0];
  }

  /**
   * Résolution "floue" par nom, utilisée par le module factures
   * quand l'IA fournit un nom de client sans ID (ex: "Mamadou").
   * Retourne 0, 1 ou plusieurs résultats — l'appelant décide quoi
   * faire (créer, désambiguïser, etc.) conformément à la règle
   * "ne jamais inventer".
   */
  async searchByName(businessId: string, name: string) {
    const { rows } = await this.pg.query(
      `SELECT * FROM customers WHERE business_id = $1 AND name ILIKE '%' || $2 || '%'`,
      [businessId, name],
    );
    return rows;
  }
}
FAKTU_EOF_MARKER_9f3a
mkdir -p "faktu/apps/api/src/customers/dto"
cat > "faktu/apps/api/src/customers/dto/create-customer.dto.ts" << 'FAKTU_EOF_MARKER_9f3a'
import { IsNotEmpty, IsOptional, IsString, IsNumber } from 'class-validator';

export class CreateCustomerDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsNumber()
  credit_limit?: number;
}
FAKTU_EOF_MARKER_9f3a
mkdir -p "faktu/apps/api/src/database"
cat > "faktu/apps/api/src/database/database.module.ts" << 'FAKTU_EOF_MARKER_9f3a'
import { Global, Module } from '@nestjs/common';
import { PgService } from './pg.service';

@Global()
@Module({
  providers: [PgService],
  exports: [PgService],
})
export class DatabaseModule {}
FAKTU_EOF_MARKER_9f3a
cat > "faktu/apps/api/src/database/pg.service.ts" << 'FAKTU_EOF_MARKER_9f3a'
import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Pool, PoolClient } from 'pg';

/**
 * Enveloppe fine autour du pool `pg`.
 * On évite volontairement un ORM pour le vertical slice initial :
 * moins de dépendances = plus facile à auditer et à faire fonctionner
 * rapidement. Un ORM (ex: Prisma/TypeORM) pourra être introduit plus
 * tard si la complexité le justifie.
 */
@Injectable()
export class PgService implements OnModuleDestroy {
  readonly pool: Pool;

  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
  }

  query<T = any>(text: string, params?: any[]) {
    return this.pool.query<T>(text, params);
  }

  async withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await fn(client);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  onModuleDestroy() {
    return this.pool.end();
  }
}
FAKTU_EOF_MARKER_9f3a
mkdir -p "faktu/apps/api/src/invoices"
cat > "faktu/apps/api/src/invoices/invoices.controller.ts" << 'FAKTU_EOF_MARKER_9f3a'
import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { PreviewInvoiceDto } from './dto/preview-invoice.dto';
import { ConfirmInvoiceDto } from './dto/confirm-invoice.dto';
import { BusinessId } from '../common/business.decorator';

@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Post('preview')
  preview(@BusinessId() businessId: string, @Body() dto: PreviewInvoiceDto) {
    return this.invoicesService.preview(businessId, dto);
  }

  @Post()
  confirm(@BusinessId() businessId: string, @Body() dto: ConfirmInvoiceDto) {
    return this.invoicesService.confirm(businessId, dto);
  }

  @Get()
  findAll(@BusinessId() businessId: string) {
    return this.invoicesService.findAll(businessId);
  }

  @Get(':id')
  findOne(@BusinessId() businessId: string, @Param('id') id: string) {
    return this.invoicesService.findOne(businessId, id);
  }
}
FAKTU_EOF_MARKER_9f3a
cat > "faktu/apps/api/src/invoices/invoices.errors.ts" << 'FAKTU_EOF_MARKER_9f3a'
import { ConflictException, NotFoundException } from '@nestjs/common';

/**
 * Erreurs métier spécifiques à la boucle de facturation.
 * Principe non négociable #1 : "Ne jamais inventer."
 * Ces exceptions renvoient toujours les options réelles (candidats)
 * plutôt qu'un choix arbitraire, pour que le client (app mobile / IA)
 * puisse redemander confirmation à l'utilisateur — voir section 6
 * "Gestion des ambiguïtés" du prompt maître.
 */

export class AmbiguousCustomerException extends ConflictException {
  constructor(candidates: any[]) {
    super({
      code: 'AMBIGUOUS_CUSTOMER',
      message: `J'ai trouvé plusieurs clients correspondants. Lequel choisissez-vous ?`,
      candidates,
    });
  }
}

export class CustomerNotFoundException extends NotFoundException {
  constructor(query: string) {
    super({
      code: 'CUSTOMER_NOT_FOUND',
      message: `Aucun client trouvé pour "${query}". Voulez-vous le créer ?`,
    });
  }
}

export class AmbiguousProductException extends ConflictException {
  constructor(query: string, candidates: any[]) {
    super({
      code: 'AMBIGUOUS_PRODUCT',
      message: `J'ai trouvé plusieurs produits pour "${query}". Lequel choisissez-vous ?`,
      candidates,
    });
  }
}

export class ProductNotFoundException extends NotFoundException {
  constructor(query: string) {
    super({
      code: 'PRODUCT_NOT_FOUND',
      message: `Aucun produit trouvé pour "${query}".`,
    });
  }
}

export class InsufficientStockException extends ConflictException {
  constructor(productName: string, available: number, requested: number) {
    super({
      code: 'INSUFFICIENT_STOCK',
      message: `Il reste seulement ${available} ${productName} alors que vous en demandez ${requested}.`,
      available,
      requested,
    });
  }
}

export class InvoiceNotPendingException extends ConflictException {
  constructor(status: string) {
    super({
      code: 'INVOICE_NOT_PENDING',
      message: `Cette facture n'est plus en attente de confirmation (statut actuel : ${status}).`,
    });
  }
}
FAKTU_EOF_MARKER_9f3a
cat > "faktu/apps/api/src/invoices/invoices.module.ts" << 'FAKTU_EOF_MARKER_9f3a'
import { Module } from '@nestjs/common';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';

@Module({
  controllers: [InvoicesController],
  providers: [InvoicesService],
  exports: [InvoicesService],
})
export class InvoicesModule {}
FAKTU_EOF_MARKER_9f3a
cat > "faktu/apps/api/src/invoices/invoices.service.ts" << 'FAKTU_EOF_MARKER_9f3a'
import { Injectable } from '@nestjs/common';
import { PoolClient } from 'pg';
import { PgService } from '../database/pg.service';
import { PreviewInvoiceDto } from './dto/preview-invoice.dto';
import { ConfirmInvoiceDto } from './dto/confirm-invoice.dto';
import {
  AmbiguousCustomerException,
  AmbiguousProductException,
  CustomerNotFoundException,
  InsufficientStockException,
  InvoiceNotPendingException,
  ProductNotFoundException,
} from './invoices.errors';

/**
 * InvoicesService implémente la boucle centrale de FAKTU (section 4) :
 *   comprendre -> vérifier -> prévisualiser -> confirmer -> exécuter
 *
 * Deux méthodes publiques :
 *   - preview() : résout client/produits, calcule les totaux,
 *                 ne touche JAMAIS au stock, crée une facture au
 *                 statut PENDING_CONFIRMATION (= la "preview" persistée).
 *   - confirm() : transforme un PENDING_CONFIRMATION en ISSUED,
 *                 dans une transaction (section 33), avec re-vérification
 *                 du stock, décrément, mouvement de stock, numérotation,
 *                 et audit.
 */
@Injectable()
export class InvoicesService {
  constructor(private readonly pg: PgService) {}

  async preview(businessId: string, dto: PreviewInvoiceDto) {
    return this.pg.withTransaction(async (client) => {
      const customer = await this.resolveCustomer(client, businessId, dto);
      const resolvedItems = await this.resolveItems(client, businessId, dto);

      let subtotal = 0;
      let discountTotal = 0;
      let taxTotal = 0;

      for (const item of resolvedItems) {
        const lineGross = item.quantity * item.unit_price;
        const lineDiscount = item.discount ?? 0;
        const lineTaxable = lineGross - lineDiscount;
        const lineTax = (lineTaxable * item.tax_rate) / 100;
        subtotal += lineGross;
        discountTotal += lineDiscount;
        taxTotal += lineTax;
      }

      const total = subtotal - discountTotal + taxTotal;
      const dueDate = dto.due_in_days
        ? new Date(Date.now() + dto.due_in_days * 24 * 60 * 60 * 1000)
        : null;

      const { rows: invoiceRows } = await client.query(
        `INSERT INTO invoices
           (business_id, customer_id, number, status, subtotal, discount, tax, total, balance_due, due_date)
         VALUES ($1, $2, $3, 'PENDING_CONFIRMATION', $4, $5, $6, $7, $7, $8)
         RETURNING *`,
        [
          businessId,
          customer.id,
          `PREVIEW-${Date.now()}`, // remplacé par un vrai numéro FAC-XXXX à la confirmation
          subtotal,
          discountTotal,
          taxTotal,
          total,
          dueDate,
        ],
      );
      const invoice = invoiceRows[0];

      for (const item of resolvedItems) {
        const lineTotal =
          item.quantity * item.unit_price - (item.discount ?? 0) +
          ((item.quantity * item.unit_price - (item.discount ?? 0)) * item.tax_rate) / 100;

        await client.query(
          `INSERT INTO invoice_items
             (invoice_id, product_id, description, quantity, unit_price, discount, tax_rate, line_total)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            invoice.id,
            item.product_id,
            item.description,
            item.quantity,
            item.unit_price,
            item.discount ?? 0,
            item.tax_rate,
            lineTotal,
          ],
        );
      }

      return {
        preview_id: invoice.id,
        requires_confirmation: true,
        customer: { id: customer.id, name: customer.name },
        items: resolvedItems.map((i) => ({
          product_id: i.product_id,
          description: i.description,
          quantity: i.quantity,
          unit_price: i.unit_price,
        })),
        subtotal,
        discount: discountTotal,
        tax: taxTotal,
        total,
        currency: 'XOF',
        due_date: dueDate,
      };
    });
  }

  async confirm(businessId: string, dto: ConfirmInvoiceDto) {
    if (!dto.confirmation) {
      // ANNULER : aucune transaction, on marque simplement la preview annulée.
      await this.pg.query(
        `UPDATE invoices SET status = 'CANCELLED', updated_at = now()
         WHERE id = $1 AND business_id = $2 AND status = 'PENDING_CONFIRMATION'`,
        [dto.preview_id, businessId],
      );
      return { status: 'CANCELLED' };
    }

    return this.pg.withTransaction(async (client) => {
      const { rows } = await client.query(
        `SELECT * FROM invoices WHERE id = $1 AND business_id = $2 FOR UPDATE`,
        [dto.preview_id, businessId],
      );
      const invoice = rows[0];
      if (!invoice) {
        throw new InvoiceNotPendingException('INTROUVABLE');
      }
      if (invoice.status !== 'PENDING_CONFIRMATION') {
        throw new InvoiceNotPendingException(invoice.status);
      }

      const { rows: items } = await client.query(
        `SELECT * FROM invoice_items WHERE invoice_id = $1`,
        [invoice.id],
      );

      // Re-vérification du stock au moment de la confirmation
      // (le stock a pu bouger entre la preview et la confirmation).
      for (const item of items) {
        if (!item.product_id) continue;
        const { rows: stockRows } = await client.query(
          `SELECT quantity FROM stock_balances WHERE product_id = $1 FOR UPDATE`,
          [item.product_id],
        );
        const available = Number(stockRows[0]?.quantity ?? 0);
        if (available < Number(item.quantity)) {
          const { rows: productRows } = await client.query(
            `SELECT name FROM products WHERE id = $1`,
            [item.product_id],
          );
          throw new InsufficientStockException(
            productRows[0]?.name ?? item.description,
            available,
            Number(item.quantity),
          );
        }
      }

      // Décrémenter le stock + mouvement de stock, pour chaque ligne
      for (const item of items) {
        if (!item.product_id) continue;
        await client.query(
          `UPDATE stock_balances SET quantity = quantity - $1, updated_at = now()
           WHERE product_id = $2`,
          [item.quantity, item.product_id],
        );
        await client.query(
          `INSERT INTO stock_movements (business_id, product_id, type, quantity, reference_type, reference_id)
           VALUES ($1, $2, 'SALE', $3, 'invoice', $4)`,
          [businessId, item.product_id, -Math.abs(item.quantity), invoice.id],
        );
      }

      const number = await this.nextInvoiceNumber(client, businessId);

      const { rows: updatedRows } = await client.query(
        `UPDATE invoices
         SET status = 'ISSUED', number = $1, updated_at = now()
         WHERE id = $2
         RETURNING *`,
        [number, invoice.id],
      );

      await client.query(
        `INSERT INTO audit_logs (business_id, action, entity_type, entity_id, before, after)
         VALUES ($1, 'CREATE_INVOICE', 'invoice', $2, $3, $4)`,
        [businessId, invoice.id, JSON.stringify(invoice), JSON.stringify(updatedRows[0])],
      );

      return updatedRows[0];
    });
  }

  async findAll(businessId: string) {
    const { rows } = await this.pg.query(
      `SELECT * FROM invoices WHERE business_id = $1 ORDER BY created_at DESC`,
      [businessId],
    );
    return rows;
  }

  async findOne(businessId: string, id: string) {
    const { rows } = await this.pg.query(
      `SELECT * FROM invoices WHERE business_id = $1 AND id = $2`,
      [businessId, id],
    );
    const { rows: items } = await this.pg.query(
      `SELECT * FROM invoice_items WHERE invoice_id = $1`,
      [id],
    );
    return { ...rows[0], items };
  }

  // ------------------------------------------------------------------
  // Résolution d'entités (section 6 — Gestion des ambiguïtés)
  // ------------------------------------------------------------------

  private async resolveCustomer(client: PoolClient, businessId: string, dto: PreviewInvoiceDto) {
    if (dto.customer_id) {
      const { rows } = await client.query(
        `SELECT * FROM customers WHERE id = $1 AND business_id = $2`,
        [dto.customer_id, businessId],
      );
      if (!rows[0]) throw new CustomerNotFoundException(dto.customer_id);
      return rows[0];
    }

    if (!dto.customer_query) {
      throw new CustomerNotFoundException('(non fourni)');
    }

    const { rows } = await client.query(
      `SELECT * FROM customers WHERE business_id = $1 AND name ILIKE '%' || $2 || '%'`,
      [businessId, dto.customer_query],
    );

    if (rows.length === 0) throw new CustomerNotFoundException(dto.customer_query);
    if (rows.length > 1) throw new AmbiguousCustomerException(rows);
    return rows[0];
  }

  private async resolveItems(client: PoolClient, businessId: string, dto: PreviewInvoiceDto) {
    const resolved = [];

    for (const item of dto.items) {
      const { rows } = await client.query(
        `SELECT p.*, COALESCE(sb.quantity, 0) AS stock
         FROM products p
         LEFT JOIN stock_balances sb ON sb.product_id = p.id
         WHERE p.business_id = $1 AND p.name ILIKE '%' || $2 || '%'`,
        [businessId, item.product_query],
      );

      if (rows.length === 0) throw new ProductNotFoundException(item.product_query);
      if (rows.length > 1) throw new AmbiguousProductException(item.product_query, rows);

      const product = rows[0];
      const availableStock = Number(product.stock);

      // Avertissement de stock dès la preview (section 6), sans bloquer :
      // le blocage définitif a lieu à la confirmation (re-vérification).
      if (availableStock < item.quantity) {
        throw new InsufficientStockException(product.name, availableStock, item.quantity);
      }

      resolved.push({
        product_id: product.id,
        description: product.name,
        quantity: item.quantity,
        unit_price: item.unit_price ?? Number(product.sale_price),
        discount: item.discount ?? 0,
        tax_rate: Number(product.tax_rate ?? 0),
      });
    }

    return resolved;
  }

  private async nextInvoiceNumber(client: PoolClient, businessId: string): Promise<string> {
    const year = new Date().getFullYear();
    // NB : approche simple par comptage : suffisante pour le MVP à faible
    // concurrence, mais pas garantie sans collision sous forte charge
    // concurrente. À remplacer par une séquence dédiée par business avant
    // la mise en production (limitation connue, à corriger).
    const { rows } = await client.query(
      `SELECT COUNT(*)::int AS count FROM invoices
       WHERE business_id = $1 AND status <> 'PENDING_CONFIRMATION' AND number LIKE $2`,
      [businessId, `FAC-${year}-%`],
    );
    const next = (rows[0]?.count ?? 0) + 1;
    return `FAC-${year}-${String(next).padStart(6, '0')}`;
  }
}
FAKTU_EOF_MARKER_9f3a
mkdir -p "faktu/apps/api/src/invoices/dto"
cat > "faktu/apps/api/src/invoices/dto/confirm-invoice.dto.ts" << 'FAKTU_EOF_MARKER_9f3a'
import { IsBoolean, IsNotEmpty, IsString } from 'class-validator';

export class ConfirmInvoiceDto {
  @IsString()
  @IsNotEmpty()
  preview_id: string;

  @IsBoolean()
  confirmation: boolean;
}
FAKTU_EOF_MARKER_9f3a
cat > "faktu/apps/api/src/invoices/dto/preview-invoice.dto.ts" << 'FAKTU_EOF_MARKER_9f3a'
import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class PreviewInvoiceItemDto {
  @IsString()
  @IsNotEmpty()
  product_query: string;

  @IsNumber()
  @IsPositive()
  quantity: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  unit_price?: number; // si absent, on utilise le prix de vente du produit

  @IsOptional()
  @IsNumber()
  @Min(0)
  discount?: number;
}

export class PreviewInvoiceDto {
  // customer_id a priorité sur customer_query si les deux sont fournis
  @IsOptional()
  @IsString()
  customer_id?: string;

  @IsOptional()
  @IsString()
  customer_query?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PreviewInvoiceItemDto)
  items: PreviewInvoiceItemDto[];

  @IsOptional()
  @IsInt()
  due_in_days?: number;
}
FAKTU_EOF_MARKER_9f3a
mkdir -p "faktu/apps/api/src/payments"
cat > "faktu/apps/api/src/payments/payments.controller.ts" << 'FAKTU_EOF_MARKER_9f3a'
import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { BusinessId } from '../common/business.decorator';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  create(@BusinessId() businessId: string, @Body() dto: CreatePaymentDto) {
    return this.paymentsService.create(businessId, dto);
  }

  @Get('by-invoice/:invoiceId')
  findByInvoice(@BusinessId() businessId: string, @Param('invoiceId') invoiceId: string) {
    return this.paymentsService.findByInvoice(businessId, invoiceId);
  }
}
FAKTU_EOF_MARKER_9f3a
cat > "faktu/apps/api/src/payments/payments.errors.ts" << 'FAKTU_EOF_MARKER_9f3a'
import { BadRequestException, NotFoundException } from '@nestjs/common';

export class InvoiceNotFoundForPaymentException extends NotFoundException {
  constructor(id: string) {
    super({ code: 'INVOICE_NOT_FOUND', message: `Facture ${id} introuvable.` });
  }
}

/**
 * Section 12 : un paiement supérieur au solde ne doit JAMAIS être
 * silencieusement accepté. On renvoie l'excédent pour que l'app
 * demande explicitement à l'utilisateur ce qu'il veut en faire
 * (ex : le garder en avance client). Le MVP bloque l'opération ;
 * la gestion de l'avance client est un TODO explicite (hors scope
 * du vertical slice initial).
 */
export class PaymentExceedsBalanceException extends BadRequestException {
  constructor(balanceDue: number, amount: number) {
    super({
      code: 'PAYMENT_EXCEEDS_BALANCE',
      message: `Le paiement dépasse le solde de ${amount - balanceDue} FCFA. Voulez-vous enregistrer cet excédent comme avance client ?`,
      balance_due: balanceDue,
      amount,
      excess: amount - balanceDue,
    });
  }
}
FAKTU_EOF_MARKER_9f3a
cat > "faktu/apps/api/src/payments/payments.module.ts" << 'FAKTU_EOF_MARKER_9f3a'
import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

@Module({
  controllers: [PaymentsController],
  providers: [PaymentsService],
})
export class PaymentsModule {}
FAKTU_EOF_MARKER_9f3a
cat > "faktu/apps/api/src/payments/payments.service.ts" << 'FAKTU_EOF_MARKER_9f3a'
import { Injectable } from '@nestjs/common';
import { PgService } from '../database/pg.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { InvoiceNotFoundForPaymentException, PaymentExceedsBalanceException } from './payments.errors';

@Injectable()
export class PaymentsService {
  constructor(private readonly pg: PgService) {}

  /**
   * Section 34 — Transaction paiement.
   * Idempotence : si la même idempotency_key est renvoyée pour la même
   * entreprise, on renvoie le paiement existant au lieu d'en créer un
   * second (TEST DOUBLON, section 41) — grâce à la contrainte UNIQUE
   * (business_id, idempotency_key) posée en base (migration V001).
   */
  async create(businessId: string, dto: CreatePaymentDto) {
    return this.pg.withTransaction(async (client) => {
      const { rows: existing } = await client.query(
        `SELECT * FROM payments WHERE business_id = $1 AND idempotency_key = $2`,
        [businessId, dto.idempotency_key],
      );
      if (existing[0]) {
        return { payment: existing[0], duplicate: true };
      }

      const { rows: invoiceRows } = await client.query(
        `SELECT * FROM invoices WHERE id = $1 AND business_id = $2 FOR UPDATE`,
        [dto.invoice_id, businessId],
      );
      const invoice = invoiceRows[0];
      if (!invoice) throw new InvoiceNotFoundForPaymentException(dto.invoice_id);

      const balanceDue = Number(invoice.balance_due);
      if (dto.amount > balanceDue) {
        throw new PaymentExceedsBalanceException(balanceDue, dto.amount);
      }

      const { rows: paymentRows } = await client.query(
        `INSERT INTO payments (business_id, invoice_id, amount, method, reference, idempotency_key)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [businessId, dto.invoice_id, dto.amount, dto.method, dto.reference ?? null, dto.idempotency_key],
      );

      const newAmountPaid = Number(invoice.amount_paid) + dto.amount;
      const newBalanceDue = Number(invoice.total) - newAmountPaid;
      const newStatus = newBalanceDue <= 0 ? 'PAID' : 'PARTIALLY_PAID';

      const { rows: updatedInvoiceRows } = await client.query(
        `UPDATE invoices
         SET amount_paid = $1, balance_due = $2, status = $3, updated_at = now()
         WHERE id = $4
         RETURNING *`,
        [newAmountPaid, Math.max(newBalanceDue, 0), newStatus, invoice.id],
      );

      await client.query(
        `INSERT INTO audit_logs (business_id, action, entity_type, entity_id, before, after)
         VALUES ($1, 'RECORD_PAYMENT', 'invoice', $2, $3, $4)`,
        [businessId, invoice.id, JSON.stringify(invoice), JSON.stringify(updatedInvoiceRows[0])],
      );

      return { payment: paymentRows[0], invoice: updatedInvoiceRows[0], duplicate: false };
    });
  }

  async findByInvoice(businessId: string, invoiceId: string) {
    const { rows } = await this.pg.query(
      `SELECT * FROM payments WHERE business_id = $1 AND invoice_id = $2 ORDER BY created_at ASC`,
      [businessId, invoiceId],
    );
    return rows;
  }
}
FAKTU_EOF_MARKER_9f3a
mkdir -p "faktu/apps/api/src/payments/dto"
cat > "faktu/apps/api/src/payments/dto/create-payment.dto.ts" << 'FAKTU_EOF_MARKER_9f3a'
import { IsIn, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';

export class CreatePaymentDto {
  @IsString()
  @IsNotEmpty()
  invoice_id: string;

  @IsNumber()
  @IsPositive()
  amount: number;

  @IsIn(['CASH', 'MOBILE_MONEY', 'BANK_TRANSFER', 'CARD', 'OTHER'])
  method: string;

  @IsOptional()
  @IsString()
  reference?: string;

  // Clé fournie par le client (app mobile) pour éviter les doublons
  // si la requête est renvoyée deux fois (mauvaise connexion, retry...).
  // Voir section 41 "TEST DOUBLON".
  @IsString()
  @IsNotEmpty()
  idempotency_key: string;
}
FAKTU_EOF_MARKER_9f3a
mkdir -p "faktu/apps/api/src/products"
cat > "faktu/apps/api/src/products/products.controller.ts" << 'FAKTU_EOF_MARKER_9f3a'
import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { BusinessId } from '../common/business.decorator';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  create(@BusinessId() businessId: string, @Body() dto: CreateProductDto) {
    return this.productsService.create(businessId, dto);
  }

  @Get()
  findAll(@BusinessId() businessId: string, @Query('search') search?: string) {
    return this.productsService.findAll(businessId, search);
  }

  @Get(':id')
  findOne(@BusinessId() businessId: string, @Param('id') id: string) {
    return this.productsService.findOne(businessId, id);
  }
}
FAKTU_EOF_MARKER_9f3a
cat > "faktu/apps/api/src/products/products.module.ts" << 'FAKTU_EOF_MARKER_9f3a'
import { Module } from '@nestjs/common';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

@Module({
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
FAKTU_EOF_MARKER_9f3a
cat > "faktu/apps/api/src/products/products.service.ts" << 'FAKTU_EOF_MARKER_9f3a'
import { Injectable, NotFoundException } from '@nestjs/common';
import { PgService } from '../database/pg.service';
import { CreateProductDto } from './dto/create-product.dto';

@Injectable()
export class ProductsService {
  constructor(private readonly pg: PgService) {}

  async create(businessId: string, dto: CreateProductDto) {
    return this.pg.withTransaction(async (client) => {
      const { rows } = await client.query(
        `INSERT INTO products (business_id, name, sku, unit, purchase_price, sale_price, tax_rate)
         VALUES ($1, $2, $3, COALESCE($4, 'unité'), COALESCE($5, 0), $6, COALESCE($7, 0))
         RETURNING *`,
        [
          businessId,
          dto.name,
          dto.sku ?? null,
          dto.unit ?? null,
          dto.purchase_price ?? null,
          dto.sale_price,
          dto.tax_rate ?? null,
        ],
      );
      const product = rows[0];

      await client.query(
        `INSERT INTO stock_balances (product_id, quantity) VALUES ($1, $2)`,
        [product.id, dto.initial_stock ?? 0],
      );

      if (dto.initial_stock && dto.initial_stock > 0) {
        await client.query(
          `INSERT INTO stock_movements (business_id, product_id, type, quantity, reference_type)
           VALUES ($1, $2, 'ADJUSTMENT', $3, 'initial_stock')`,
          [businessId, product.id, dto.initial_stock],
        );
      }

      return { ...product, stock: dto.initial_stock ?? 0 };
    });
  }

  async findAll(businessId: string, search?: string) {
    const { rows } = await this.pg.query(
      `SELECT p.*, COALESCE(sb.quantity, 0) AS stock
       FROM products p
       LEFT JOIN stock_balances sb ON sb.product_id = p.id
       WHERE p.business_id = $1
         AND ($2::text IS NULL OR p.name ILIKE '%' || $2 || '%')
       ORDER BY p.name ASC`,
      [businessId, search ?? null],
    );
    return rows;
  }

  async findOne(businessId: string, id: string) {
    const { rows } = await this.pg.query(
      `SELECT p.*, COALESCE(sb.quantity, 0) AS stock
       FROM products p
       LEFT JOIN stock_balances sb ON sb.product_id = p.id
       WHERE p.business_id = $1 AND p.id = $2`,
      [businessId, id],
    );
    if (!rows[0]) throw new NotFoundException('Produit introuvable');
    return rows[0];
  }

  async searchByName(businessId: string, name: string) {
    const { rows } = await this.pg.query(
      `SELECT p.*, COALESCE(sb.quantity, 0) AS stock
       FROM products p
       LEFT JOIN stock_balances sb ON sb.product_id = p.id
       WHERE p.business_id = $1 AND p.name ILIKE '%' || $2 || '%'`,
      [businessId, name],
    );
    return rows;
  }
}
FAKTU_EOF_MARKER_9f3a
mkdir -p "faktu/apps/api/src/products/dto"
cat > "faktu/apps/api/src/products/dto/create-product.dto.ts" << 'FAKTU_EOF_MARKER_9f3a'
import { IsNotEmpty, IsOptional, IsString, IsNumber } from 'class-validator';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  sku?: string;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsNumber()
  purchase_price?: number;

  @IsNumber()
  sale_price: number;

  @IsOptional()
  @IsNumber()
  tax_rate?: number;

  @IsOptional()
  @IsNumber()
  initial_stock?: number;
}
FAKTU_EOF_MARKER_9f3a
mkdir -p "faktu/apps/api/src/voice"
cat > "faktu/apps/api/src/voice/voice.controller.ts" << 'FAKTU_EOF_MARKER_9f3a'
import { Body, Controller, Post } from '@nestjs/common';
import { VoiceService } from './voice.service';
import { TranscribeDto } from './dto/transcribe.dto';

@Controller('voice')
export class VoiceController {
  constructor(private readonly voiceService: VoiceService) {}

  @Post('transcribe')
  transcribe(@Body() dto: TranscribeDto) {
    return this.voiceService.transcribe(dto.audio_base64, dto.mime_type);
  }
}
FAKTU_EOF_MARKER_9f3a
cat > "faktu/apps/api/src/voice/voice.module.ts" << 'FAKTU_EOF_MARKER_9f3a'
import { Module } from '@nestjs/common';
import { VoiceController } from './voice.controller';
import { VoiceService } from './voice.service';

@Module({
  controllers: [VoiceController],
  providers: [VoiceService],
  exports: [VoiceService],
})
export class VoiceModule {}
FAKTU_EOF_MARKER_9f3a
cat > "faktu/apps/api/src/voice/voice.service.ts" << 'FAKTU_EOF_MARKER_9f3a'
import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';

/**
 * Transcription vocale (Speech-to-Text).
 *
 * NON TESTÉ dans cet environnement : aucun accès réseau sortant, donc
 * impossible d'appeler un vrai fournisseur STT ici. Le code ci-dessous
 * implémente l'appel à l'API OpenAI Whisper (multipart/form-data) selon
 * sa documentation standard — à vérifier avec un vrai fichier audio et
 * une vraie clé API avant mise en service.
 *
 * Alternative envisageable : Google Cloud Speech-to-Text (meilleur
 * support probable du wolof/pulaar à terme, section 23) — à évaluer
 * lors du pilote terrain (section 42).
 */
@Injectable()
export class VoiceService {
  private readonly logger = new Logger(VoiceService.name);

  async transcribe(audioBase64: string, mimeType: string): Promise<{ transcript: string; provider: string }> {
    const apiKey = process.env.AI_API_KEY;
    if (!apiKey) {
      throw new ServiceUnavailableException(
        'AI_API_KEY non configuré : la transcription vocale est indisponible. ' +
          'L\'utilisateur peut saisir sa commande en texte en attendant.',
      );
    }

    const buffer = Buffer.from(audioBase64, 'base64');
    const extension = mimeType.split('/')[1] || 'm4a';

    const form = new FormData();
    form.append('file', new Blob([buffer], { type: mimeType }), `audio.${extension}`);
    form.append('model', 'whisper-1');
    form.append('language', 'fr');

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    });

    if (!response.ok) {
      this.logger.error(`Whisper API a échoué : ${response.status}`);
      throw new ServiceUnavailableException('La transcription a échoué. Réessayez ou saisissez le texte.');
    }

    const data: any = await response.json();
    return { transcript: data.text, provider: 'openai-whisper' };
  }
}
FAKTU_EOF_MARKER_9f3a
mkdir -p "faktu/apps/api/src/voice/dto"
cat > "faktu/apps/api/src/voice/dto/transcribe.dto.ts" << 'FAKTU_EOF_MARKER_9f3a'
import { IsNotEmpty, IsString } from 'class-validator';

export class TranscribeDto {
  // Audio encodé en base64 (envoyé par l'app mobile après enregistrement).
  @IsString()
  @IsNotEmpty()
  audio_base64: string;

  // ex: 'audio/m4a', 'audio/wav'
  @IsString()
  @IsNotEmpty()
  mime_type: string;
}
FAKTU_EOF_MARKER_9f3a
mkdir -p "faktu/apps/mobile"
cat > "faktu/apps/mobile/PERMISSIONS.md" << 'FAKTU_EOF_MARKER_9f3a'
# Permissions micro — à ajouter après `flutter create .`

Ce dossier ne contient que `lib/` et `pubspec.yaml` : les dossiers
`android/` et `ios/` n'existent pas encore, car leur génération demande
le SDK Flutter (absent de cet environnement de développement).

**Étape obligatoire avant de lancer l'app**, une fois Flutter installé :

```bash
cd apps/mobile
flutter create .          # génère android/, ios/, etc. sans toucher à lib/
flutter pub get
```

Puis ajoute manuellement ces permissions (le micro ne fonctionnera pas sans elles) :

## Android — `android/app/src/main/AndroidManifest.xml`

Ajouter juste avant `<application ...>` :

```xml
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.INTERNET" />
```

## iOS — `ios/Runner/Info.plist`

Ajouter dans le dictionnaire principal (`<dict> ... </dict>`) :

```xml
<key>NSMicrophoneUsageDescription</key>
<string>FAKTU a besoin du micro pour créer vos factures à la voix.</string>
<key>NSSpeechRecognitionUsageDescription</key>
<string>FAKTU utilise la reconnaissance vocale pour comprendre vos commandes.</string>
```

## Vérification

Une fois ces permissions ajoutées et l'API lancée (`docker-compose up`),
lance l'app sur un émulateur ou un téléphone et appuie sur le bouton
micro. Si rien ne se passe : vérifie d'abord les logs Flutter
(`flutter run` affiche les erreurs de permission en clair).
FAKTU_EOF_MARKER_9f3a
cat > "faktu/apps/mobile/README.md" << 'FAKTU_EOF_MARKER_9f3a'
# apps/mobile

Application mobile FAKTU (Flutter / Dart).
C'est ici que vivra l'app utilisée par les commerçants : saisie vocale,
prévisualisation de facture, confirmation, historique, etc.

Statut : dossier vide, pas encore initialisé (à faire à une étape ultérieure).
FAKTU_EOF_MARKER_9f3a
cat > "faktu/apps/mobile/pubspec.yaml" << 'FAKTU_EOF_MARKER_9f3a'
name: faktu_mobile
description: Application mobile FAKTU — assistant vocal de gestion commerciale
publish_to: 'none'
version: 0.1.0+1

environment:
  sdk: '>=3.3.0 <4.0.0'

dependencies:
  flutter:
    sdk: flutter
  http: ^1.2.0
  speech_to_text: ^7.0.0
  provider: ^6.1.0
  intl: ^0.19.0

dev_dependencies:
  flutter_test:
    sdk: flutter
  flutter_lints: ^4.0.0

flutter:
  uses-material-design: true
FAKTU_EOF_MARKER_9f3a
mkdir -p "faktu/apps/mobile/lib"
cat > "faktu/apps/mobile/lib/main.dart" << 'FAKTU_EOF_MARKER_9f3a'
import 'package:flutter/material.dart';
import 'screens/voice_home_screen.dart';

void main() {
  runApp(const FaktuApp());
}

class FaktuApp extends StatelessWidget {
  const FaktuApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'FAKTU',
      theme: ThemeData(colorSchemeSeed: Colors.indigo, useMaterial3: true),
      home: const VoiceHomeScreen(),
    );
  }
}
FAKTU_EOF_MARKER_9f3a
mkdir -p "faktu/apps/mobile/lib/models"
cat > "faktu/apps/mobile/lib/models/invoice_preview.dart" << 'FAKTU_EOF_MARKER_9f3a'
/// Reflète la réponse de POST /api/v1/invoices/preview.
/// Aucune écriture définitive n'a eu lieu côté serveur à ce stade
/// (section 5 du prompt maître) — c'est pourquoi ce modèle porte
/// explicitement `requiresConfirmation`.
class InvoicePreview {
  final String previewId;
  final String customerName;
  final List<InvoicePreviewItem> items;
  final num total;
  final bool requiresConfirmation;

  InvoicePreview({
    required this.previewId,
    required this.customerName,
    required this.items,
    required this.total,
    required this.requiresConfirmation,
  });

  factory InvoicePreview.fromJson(Map<String, dynamic> json) {
    return InvoicePreview(
      previewId: json['preview_id'] as String,
      customerName: (json['customer']?['name'] ?? '') as String,
      items: (json['items'] as List)
          .map((e) => InvoicePreviewItem.fromJson(e as Map<String, dynamic>))
          .toList(),
      total: json['total'] as num,
      requiresConfirmation: json['requires_confirmation'] as bool? ?? true,
    );
  }
}

class InvoicePreviewItem {
  final String description;
  final num quantity;
  final num unitPrice;

  InvoicePreviewItem({required this.description, required this.quantity, required this.unitPrice});

  factory InvoicePreviewItem.fromJson(Map<String, dynamic> json) {
    return InvoicePreviewItem(
      description: json['description'] as String,
      quantity: json['quantity'] as num,
      unitPrice: json['unit_price'] as num,
    );
  }
}
FAKTU_EOF_MARKER_9f3a
mkdir -p "faktu/apps/mobile/lib/screens"
cat > "faktu/apps/mobile/lib/screens/invoice_preview_screen.dart" << 'FAKTU_EOF_MARKER_9f3a'
import 'package:flutter/material.dart';
import '../models/invoice_preview.dart';
import '../services/faktu_api.dart';

/// Reproduit l'écran décrit section 5 du prompt maître :
/// "J'AI COMPRIS : ... [CONFIRMER] [MODIFIER] [ANNULER]"
/// Aucune écriture définitive n'a lieu avant un appui sur CONFIRMER.
class InvoicePreviewScreen extends StatefulWidget {
  final FaktuApi api;
  final InvoicePreview preview;

  const InvoicePreviewScreen({super.key, required this.api, required this.preview});

  @override
  State<InvoicePreviewScreen> createState() => _InvoicePreviewScreenState();
}

class _InvoicePreviewScreenState extends State<InvoicePreviewScreen> {
  bool _loading = false;

  Future<void> _confirm(bool confirmation) async {
    setState(() => _loading = true);
    try {
      final result = await widget.api.confirmInvoice(
        previewId: widget.preview.previewId,
        confirmation: confirmation,
      );
      if (!mounted) return;
      if (confirmation) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Facture ${result['number']} créée ✅')),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Facture annulée')),
        );
      }
      Navigator.of(context).pop(result);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Erreur : $e')),
      );
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = widget.preview;
    return Scaffold(
      appBar: AppBar(title: const Text("J'ai compris")),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Client : ${p.customerName}', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 12),
            ...p.items.map(
              (item) => Text('${item.description} — ${item.quantity} x ${item.unitPrice} F'),
            ),
            const Divider(height: 32),
            Text('Total : ${p.total} F', style: Theme.of(context).textTheme.headlineSmall),
            const Spacer(),
            if (_loading) const Center(child: CircularProgressIndicator()),
            if (!_loading)
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  OutlinedButton(onPressed: () => _confirm(false), child: const Text('ANNULER')),
                  ElevatedButton(onPressed: () => _confirm(true), child: const Text('CONFIRMER')),
                ],
              ),
          ],
        ),
      ),
    );
  }
}
FAKTU_EOF_MARKER_9f3a
cat > "faktu/apps/mobile/lib/screens/voice_home_screen.dart" << 'FAKTU_EOF_MARKER_9f3a'
import 'package:flutter/material.dart';
import '../models/invoice_preview.dart';
import '../services/faktu_api.dart';
import '../services/voice_input_service.dart';
import 'invoice_preview_screen.dart';

/// Écran principal — remplace le formulaire à champs séparés par le
/// vrai flux vocal : 🎙️ Parler -> transcription -> compréhension ->
/// prévisualisation (section 4 du prompt maître).
///
/// Un champ texte reste disponible en repli : le cahier des charges
/// exige que FAKTU reste utilisable en environnement bruyant ou avec
/// un micro/connexion défaillants (section 42 — pilote terrain).
///
/// NON TESTÉ : pas de SDK Flutter disponible dans cet environnement de
/// développement (voir STATUT.md). À valider en priorité lors du
/// premier `flutter run` sur un vrai appareil.
class VoiceHomeScreen extends StatefulWidget {
  const VoiceHomeScreen({super.key});

  @override
  State<VoiceHomeScreen> createState() => _VoiceHomeScreenState();
}

class _VoiceHomeScreenState extends State<VoiceHomeScreen> {
  final _voice = VoiceInputService();
  final _textController = TextEditingController();

  // À adapter : URL de l'API déployée + identifiant réel de l'entreprise
  // (viendra de l'authentification une fois FAKTU-003 fait).
  late final _api = FaktuApi(
    baseUrl: 'http://10.0.2.2:3000/api/v1',
    businessId: '00000000-0000-0000-0000-000000000001',
  );

  bool _micReady = false;
  bool _listening = false;
  bool _processing = false;
  String _liveTranscript = '';
  String? _statusMessage;

  @override
  void initState() {
    super.initState();
    _initVoice();
  }

  Future<void> _initVoice() async {
    final ok = await _voice.init(
      onStatus: (status) {
        if (status == 'notListening' && mounted) {
          setState(() => _listening = false);
        }
      },
      onError: (error) {
        if (!mounted) return;
        setState(() {
          _listening = false;
          _statusMessage = 'Erreur micro : $error';
        });
      },
    );
    if (mounted) {
      setState(() {
        _micReady = ok;
        _statusMessage = ok ? null : "Micro indisponible sur cet appareil — utilisez le champ texte ci-dessous.";
      });
    }
  }

  Future<void> _toggleListening() async {
    if (!_micReady) return;

    if (_listening) {
      await _voice.stopListening();
      setState(() => _listening = false);
      if (_liveTranscript.trim().isNotEmpty) {
        await _sendCommand(_liveTranscript.trim());
      }
      return;
    }

    setState(() {
      _liveTranscript = '';
      _statusMessage = null;
      _listening = true;
    });

    await _voice.startListening(
      onResult: (text, isFinal) {
        if (!mounted) return;
        setState(() => _liveTranscript = text);
        if (isFinal) {
          setState(() => _listening = false);
          if (text.trim().isNotEmpty) {
            _sendCommand(text.trim());
          }
        }
      },
    );
  }

  Future<void> _sendCommand(String transcript) async {
    setState(() {
      _processing = true;
      _statusMessage = null;
    });

    try {
      final result = await _api.runAssistantCommand(transcript);
      if (!mounted) return;

      switch (result['step']) {
        case 'PREVIEW_READY':
          final preview = InvoicePreview.fromJson(result['preview'] as Map<String, dynamic>);
          await Navigator.of(context).push(
            MaterialPageRoute(builder: (_) => InvoicePreviewScreen(api: _api, preview: preview)),
          );
          setState(() => _liveTranscript = '');
          break;

        case 'CLARIFICATION_NEEDED':
          setState(() => _statusMessage = result['clarification_question'] as String? ?? "J'ai besoin de précisions.");
          break;

        case 'INTENT_NOT_YET_WIRED':
          setState(() => _statusMessage = result['message'] as String? ?? 'Cette action n\'est pas encore disponible.');
          break;

        default:
          setState(() => _statusMessage = "Je n'ai pas compris. Réessayez.");
      }
    } catch (e) {
      if (!mounted) return;
      setState(() => _statusMessage = 'Erreur : $e');
    } finally {
      if (mounted) setState(() => _processing = false);
    }
  }

  @override
  void dispose() {
    _voice.cancel();
    _textController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('FAKTU')),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          children: [
            const Spacer(),
            Text(
              _listening
                  ? (_liveTranscript.isEmpty ? 'Je vous écoute…' : _liveTranscript)
                  : 'Parlez. FAKTU fait le reste.',
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.headlineSmall,
            ),
            const SizedBox(height: 24),
            if (_processing) const CircularProgressIndicator(),
            if (!_processing)
              GestureDetector(
                onTap: _micReady ? _toggleListening : null,
                child: CircleAvatar(
                  radius: 44,
                  backgroundColor: _listening ? Colors.red : Theme.of(context).colorScheme.primary,
                  child: Icon(
                    _listening ? Icons.stop : Icons.mic,
                    color: Colors.white,
                    size: 40,
                  ),
                ),
              ),
            if (_statusMessage != null) ...[
              const SizedBox(height: 16),
              Text(_statusMessage!, textAlign: TextAlign.center, style: const TextStyle(color: Colors.orange)),
            ],
            const Spacer(),
            const Divider(),
            const SizedBox(height: 8),
            const Text('Ou tapez votre commande :'),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _textController,
                    decoration: const InputDecoration(
                      hintText: 'ex : facture à Mamadou pour 20 sacs de ciment à 6500 francs',
                      border: OutlineInputBorder(),
                    ),
                    onSubmitted: (text) {
                      if (text.trim().isNotEmpty) _sendCommand(text.trim());
                    },
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.send),
                  onPressed: () {
                    final text = _textController.text.trim();
                    if (text.isNotEmpty) _sendCommand(text);
                  },
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
FAKTU_EOF_MARKER_9f3a
mkdir -p "faktu/apps/mobile/lib/services"
cat > "faktu/apps/mobile/lib/services/faktu_api.dart" << 'FAKTU_EOF_MARKER_9f3a'
import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/invoice_preview.dart';

/// Client HTTP vers l'API FAKTU (apps/api).
/// businessId est transmis en header pour le MVP (avant que
/// l'authentification complète — FAKTU-003 — soit branchée).
class FaktuApi {
  final String baseUrl;
  final String businessId;

  FaktuApi({required this.baseUrl, required this.businessId});

  Map<String, String> get _headers => {
        'Content-Type': 'application/json',
        'x-business-id': businessId,
      };

  Future<InvoicePreview> previewInvoice({
    required String customerQuery,
    required String productQuery,
    required num quantity,
    num? unitPrice,
    int? dueInDays,
  }) async {
    final response = await http.post(
      Uri.parse('$baseUrl/invoices/preview'),
      headers: _headers,
      body: jsonEncode({
        'customer_query': customerQuery,
        'items': [
          {
            'product_query': productQuery,
            'quantity': quantity,
            if (unitPrice != null) 'unit_price': unitPrice,
          }
        ],
        if (dueInDays != null) 'due_in_days': dueInDays,
      }),
    );

    if (response.statusCode >= 400) {
      throw FaktuApiException(response.statusCode, response.body);
    }
    return InvoicePreview.fromJson(jsonDecode(response.body) as Map<String, dynamic>);
  }

  Future<Map<String, dynamic>> confirmInvoice({
    required String previewId,
    required bool confirmation,
  }) async {
    final response = await http.post(
      Uri.parse('$baseUrl/invoices'),
      headers: _headers,
      body: jsonEncode({'preview_id': previewId, 'confirmation': confirmation}),
    );
    if (response.statusCode >= 400) {
      throw FaktuApiException(response.statusCode, response.body);
    }
    return jsonDecode(response.body) as Map<String, dynamic>;
  }

  /// Point d'entrée unique de la boucle vocale : transcript -> intention
  /// -> (preview si CREATE_INVOICE) OU question de clarification.
  /// Voir apps/api/src/assistant/assistant.controller.ts.
  Future<Map<String, dynamic>> runAssistantCommand(String transcript) async {
    final response = await http.post(
      Uri.parse('$baseUrl/assistant/command'),
      headers: _headers,
      body: jsonEncode({'transcript': transcript}),
    );
    if (response.statusCode >= 400) {
      throw FaktuApiException(response.statusCode, response.body);
    }
    return jsonDecode(response.body) as Map<String, dynamic>;
  }
}

class FaktuApiException implements Exception {
  final int statusCode;
  final String body;
  FaktuApiException(this.statusCode, this.body);

  @override
  String toString() => 'FaktuApiException($statusCode): $body';
}
FAKTU_EOF_MARKER_9f3a
cat > "faktu/apps/mobile/lib/services/voice_input_service.dart" << 'FAKTU_EOF_MARKER_9f3a'
import 'package:speech_to_text/speech_to_text.dart' as stt;
import 'package:speech_to_text/speech_recognition_error.dart';

/// Enveloppe autour du plugin `speech_to_text` (reconnaissance vocale
/// EMBARQUÉE, sur l'appareil — pas d'appel réseau nécessaire pour cette
/// partie, ce qui aide pour le mode hors ligne, section 35).
///
/// NON TESTÉ : aucun SDK Flutter/Dart n'est disponible dans cet
/// environnement de développement, donc ce code n'a jamais été compilé
/// ni exécuté sur un appareil. Écrit selon la documentation officielle
/// du package `speech_to_text` (v7). À vérifier en premier lors du
/// premier `flutter run` réel.
class VoiceInputService {
  final stt.SpeechToText _speech = stt.SpeechToText();
  bool _available = false;

  bool get isAvailable => _available;
  bool get isListening => _speech.isListening;

  /// À appeler une fois (ex: dans initState) avant toute écoute.
  /// Déclenche la demande de permission micro côté OS si nécessaire.
  Future<bool> init({
    required void Function(String status) onStatus,
    required void Function(String error) onError,
  }) async {
    _available = await _speech.initialize(
      onStatus: onStatus,
      onError: (SpeechRecognitionError e) => onError(e.errorMsg),
    );
    return _available;
  }

  Future<void> startListening({
    required void Function(String text, bool isFinal) onResult,
    String localeId = 'fr_FR',
  }) async {
    if (!_available) return;
    await _speech.listen(
      localeId: localeId,
      onResult: (result) => onResult(result.recognizedWords, result.finalResult),
      listenOptions: stt.SpeechListenOptions(
        partialResults: true,
        cancelOnError: true,
      ),
    );
  }

  Future<void> stopListening() => _speech.stop();

  Future<void> cancel() => _speech.cancel();
}
FAKTU_EOF_MARKER_9f3a
mkdir -p "faktu/apps/web"
cat > "faktu/apps/web/README.md" << 'FAKTU_EOF_MARKER_9f3a'
# apps/web

Interface web FAKTU (optionnelle / back-office), non prioritaire pour le MVP.

Statut : dossier vide, non prioritaire (voir roadmap P1/P2).
FAKTU_EOF_MARKER_9f3a
mkdir -p "faktu/database/migrations"
cat > "faktu/database/migrations/README.md" << 'FAKTU_EOF_MARKER_9f3a'
# database/migrations

Migrations SQL PostgreSQL (schéma de la base de données).
La première migration (V001) sera créée à l'ÉTAPE 4.

Statut : dossier vide.
FAKTU_EOF_MARKER_9f3a
cat > "faktu/database/migrations/V001__init.sql" << 'FAKTU_EOF_MARKER_9f3a'
-- ============================================================
-- FAKTU — Migration V001 — Fondation du schéma
-- IMPORTANT : cette migration n'a PAS été exécutée contre une
-- vraie instance PostgreSQL dans cet environnement (pas d'accès
-- réseau/DB). Elle doit être vérifiée et testée avant usage.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm; -- nécessaire pour les index gin_trgm_ops ci-dessous

-- ============================================================
-- ENTREPRISES & UTILISATEURS
-- ============================================================

CREATE TABLE businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'SN',
  currency CHAR(3) NOT NULL DEFAULT 'XOF',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  phone TEXT UNIQUE,
  email TEXT UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE, -- OWNER, ADMIN, MANAGER, SELLER, CASHIER, ACCOUNTANT, STOCK_MANAGER
  label TEXT NOT NULL
);

CREATE TABLE permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE -- invoice.create, payment.create, report.read, ...
);

CREATE TABLE role_permissions (
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE business_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (business_id, user_id)
);

-- ============================================================
-- CLIENTS & FOURNISSEURS
-- ============================================================

CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  notes TEXT,
  credit_limit NUMERIC(18,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_customers_business ON customers(business_id);
CREATE INDEX idx_customers_name_trgm ON customers USING gin (name gin_trgm_ops);

CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_suppliers_business ON suppliers(business_id);

-- ============================================================
-- PRODUITS & STOCK
-- ============================================================

CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  UNIQUE (business_id, name)
);

CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id),
  name TEXT NOT NULL,
  sku TEXT,
  unit TEXT NOT NULL DEFAULT 'unité',
  purchase_price NUMERIC(18,2) NOT NULL DEFAULT 0,
  sale_price NUMERIC(18,2) NOT NULL DEFAULT 0,
  tax_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  min_threshold NUMERIC(18,3) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (business_id, sku)
);
CREATE INDEX idx_products_business ON products(business_id);
CREATE INDEX idx_products_name_trgm ON products USING gin (name gin_trgm_ops);

CREATE TABLE stock_balances (
  product_id UUID PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
  quantity NUMERIC(18,3) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  type TEXT NOT NULL CHECK (type IN ('PURCHASE','SALE','ADJUSTMENT','RETURN','TRANSFER')),
  quantity NUMERIC(18,3) NOT NULL, -- positif ou négatif selon le type
  reference_type TEXT,             -- ex: 'invoice', 'purchase'
  reference_id UUID,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_stock_movements_product ON stock_movements(product_id);
CREATE INDEX idx_stock_movements_business ON stock_movements(business_id);

-- ============================================================
-- FACTURES
-- ============================================================

CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id),
  customer_id UUID REFERENCES customers(id),
  number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'DRAFT'
    CHECK (status IN ('DRAFT','PENDING_CONFIRMATION','ISSUED','PARTIALLY_PAID','PAID','OVERDUE','CANCELLED')),
  currency CHAR(3) NOT NULL DEFAULT 'XOF',
  subtotal NUMERIC(18,2) NOT NULL DEFAULT 0,
  discount NUMERIC(18,2) NOT NULL DEFAULT 0,
  tax NUMERIC(18,2) NOT NULL DEFAULT 0,
  total NUMERIC(18,2) NOT NULL DEFAULT 0,
  amount_paid NUMERIC(18,2) NOT NULL DEFAULT 0,
  balance_due NUMERIC(18,2) NOT NULL DEFAULT 0,
  due_date DATE,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (business_id, number)
);
CREATE INDEX idx_invoices_business ON invoices(business_id);
CREATE INDEX idx_invoices_customer ON invoices(customer_id);
CREATE INDEX idx_invoices_status ON invoices(status);

CREATE TABLE invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  description TEXT NOT NULL,
  quantity NUMERIC(18,3) NOT NULL,
  unit_price NUMERIC(18,2) NOT NULL,
  discount NUMERIC(18,2) NOT NULL DEFAULT 0,
  tax_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  line_total NUMERIC(18,2) NOT NULL
);
CREATE INDEX idx_invoice_items_invoice ON invoice_items(invoice_id);

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id),
  invoice_id UUID NOT NULL REFERENCES invoices(id),
  amount NUMERIC(18,2) NOT NULL,
  method TEXT NOT NULL CHECK (method IN ('CASH','MOBILE_MONEY','BANK_TRANSFER','CARD','OTHER')),
  reference TEXT,
  idempotency_key TEXT, -- évite les doublons de paiement (TEST DOUBLON)
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (business_id, idempotency_key)
);
CREATE INDEX idx_payments_invoice ON payments(invoice_id);

-- ============================================================
-- ACHATS (structure de base, non prioritaire MVP vertical slice)
-- ============================================================

CREATE TABLE purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id),
  supplier_id UUID REFERENCES suppliers(id),
  status TEXT NOT NULL DEFAULT 'DRAFT',
  total NUMERIC(18,2) NOT NULL DEFAULT 0,
  amount_paid NUMERIC(18,2) NOT NULL DEFAULT 0,
  balance_due NUMERIC(18,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE purchase_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id UUID NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  quantity NUMERIC(18,3) NOT NULL,
  unit_price NUMERIC(18,2) NOT NULL,
  line_total NUMERIC(18,2) NOT NULL
);

CREATE TABLE supplier_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id),
  purchase_id UUID NOT NULL REFERENCES purchases(id),
  amount NUMERIC(18,2) NOT NULL,
  method TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- DÉPENSES
-- ============================================================

CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id),
  category TEXT NOT NULL,
  amount NUMERIC(18,2) NOT NULL,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_expenses_business ON expenses(business_id);

-- ============================================================
-- IA, AUDIT, NOTIFICATIONS
-- ============================================================

CREATE TABLE ai_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id),
  user_id UUID REFERENCES users(id),
  transcript TEXT,
  intent TEXT,
  confidence NUMERIC(5,4),
  entities JSONB,
  requires_confirmation BOOLEAN,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id),
  user_id UUID REFERENCES users(id),
  action TEXT NOT NULL,        -- ex: CREATE_INVOICE, RECORD_PAYMENT
  entity_type TEXT NOT NULL,   -- ex: invoice, payment
  entity_id UUID,
  before JSONB,
  after JSONB,
  device TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_business ON audit_logs(business_id);
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id),
  user_id UUID REFERENCES users(id),
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
FAKTU_EOF_MARKER_9f3a
mkdir -p "faktu/database/seeds"
cat > "faktu/database/seeds/001_seed_demo.sql" << 'FAKTU_EOF_MARKER_9f3a'
-- ============================================================
-- FAKTU — Seed de démonstration (ÉTAPE 5)
-- Correspond exactement à l'exemple officiel du prompt maître.
-- Non exécuté dans cet environnement (pas de PostgreSQL disponible).
-- UUIDs fixes pour pouvoir être référencés facilement en dev/tests.
-- ============================================================

INSERT INTO businesses (id, name, country, currency)
VALUES ('00000000-0000-0000-0000-000000000001', 'Boutique Test FAKTU', 'SN', 'XOF');

INSERT INTO users (id, full_name, phone, password_hash)
VALUES ('00000000-0000-0000-0000-000000000002', 'Utilisateur Test', '+221770000000', 'REPLACE_WITH_REAL_HASH');

INSERT INTO roles (id, code, label) VALUES
  ('00000000-0000-0000-0000-000000000010', 'OWNER', 'Propriétaire'),
  ('00000000-0000-0000-0000-000000000011', 'SELLER', 'Vendeur');

INSERT INTO business_members (business_id, user_id, role_id)
VALUES ('00000000-0000-0000-0000-000000000001',
        '00000000-0000-0000-0000-000000000002',
        '00000000-0000-0000-0000-000000000010');

INSERT INTO customers (id, business_id, name, phone)
VALUES ('00000000-0000-0000-0000-000000000003',
        '00000000-0000-0000-0000-000000000001',
        'Mamadou Ndiaye', '+221771111111');

INSERT INTO products (id, business_id, name, unit, purchase_price, sale_price, tax_rate)
VALUES ('00000000-0000-0000-0000-000000000004',
        '00000000-0000-0000-0000-000000000001',
        'Ciment 50 kg', 'sac', 4800, 6500, 0);

INSERT INTO stock_balances (product_id, quantity)
VALUES ('00000000-0000-0000-0000-000000000004', 100);
FAKTU_EOF_MARKER_9f3a
cat > "faktu/database/seeds/README.md" << 'FAKTU_EOF_MARKER_9f3a'
# database/seeds

Données de démonstration (seed) : entreprise test, client Mamadou Ndiaye,
produit Ciment 50 kg, stock initial. Seront créées à l'ÉTAPE 5.

Statut : dossier vide.
FAKTU_EOF_MARKER_9f3a
mkdir -p "faktu/docs/api"
cat > "faktu/docs/api/README.md" << 'FAKTU_EOF_MARKER_9f3a'
# docs/api

Documentation des endpoints API (OpenAPI / exemples de requêtes-réponses).
FAKTU_EOF_MARKER_9f3a
mkdir -p "faktu/docs/architecture"
cat > "faktu/docs/architecture/README.md" << 'FAKTU_EOF_MARKER_9f3a'
# docs/architecture

Documentation technique : stack, ERD, architecture IA, RBAC, audit, offline.
FAKTU_EOF_MARKER_9f3a
mkdir -p "faktu/docs/product"
cat > "faktu/docs/product/README.md" << 'FAKTU_EOF_MARKER_9f3a'
# docs/product

Documentation produit : vision, cibles, boucle centrale, exemples officiels,
gestion des ambiguïtés, modèle économique.
FAKTU_EOF_MARKER_9f3a
mkdir -p "faktu/docs/ux"
cat > "faktu/docs/ux/README.md" << 'FAKTU_EOF_MARKER_9f3a'
# docs/ux

Parcours utilisateur, exemples de conversation, gestion des ambiguïtés côté UX.
FAKTU_EOF_MARKER_9f3a
mkdir -p "faktu/packages/config"
cat > "faktu/packages/config/README.md" << 'FAKTU_EOF_MARKER_9f3a'
# packages/config

Configuration partagée (constantes, valeurs par défaut, paramètres
d'environnement communs à plusieurs apps).

Statut : dossier vide.
FAKTU_EOF_MARKER_9f3a
mkdir -p "faktu/packages/types"
cat > "faktu/packages/types/README.md" << 'FAKTU_EOF_MARKER_9f3a'
# packages/types

Types TypeScript partagés entre l'API, le mobile (si besoin) et le web
(ex : Invoice, Customer, Product, Payment...).

Statut : dossier vide.
FAKTU_EOF_MARKER_9f3a
mkdir -p "faktu/packages/validation"
cat > "faktu/packages/validation/README.md" << 'FAKTU_EOF_MARKER_9f3a'
# packages/validation

Règles de validation métier partagées (ex : schémas de validation
des factures, des paiements, des montants) pour garantir la cohérence
entre les différentes couches de l'application.

Statut : dossier vide.
FAKTU_EOF_MARKER_9f3a
mkdir -p "faktu/prototype"
cat > "faktu/prototype/intent-extractor-demo.js" << 'FAKTU_EOF_MARKER_9f3a'
'use strict';

/**
 * FAKTU — Extracteur d'intention (règles / regex), FRANÇAIS.
 *
 * RÔLE DANS L'ARCHITECTURE (section 22 du prompt maître) :
 * C'est le filet de sécurité "hors-ligne" / secours de l'Intent Engine.
 * Le chemin principal en production appelle un vrai modèle de langage
 * (voir apps/api/src/ai/ai.service.ts) pour comprendre des phrases
 * naturelles variées. Mais un LLM peut être indisponible (pas de
 * réseau, panne, clé API absente) — hors ligne est un principe du
 * cahier des charges (section 35). Ce module base sur des règles
 * garantit que FAKTU reste utilisable même sans IA externe, pour les
 * formulations les plus courantes.
 *
 * PRINCIPE RESPECTÉ : "Ne jamais inventer" (section 6 / 45).
 * Si une information manque (quantité, prix...), on ne devine JAMAIS
 * une valeur : on retourne `requires_clarification: true` avec la
 * question exacte à poser.
 */

function parseAmount(raw) {
  // "6 500" / "6.500" / "6,500" -> 6500
  const cleaned = raw.replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
  const value = parseFloat(cleaned);
  return Number.isFinite(value) ? value : null;
}

function extractIntent(transcript) {
  const text = transcript.trim();

  // ---- CREATE_INVOICE ----
  // "Fais une facture à Mamadou pour 20 sacs de ciment à 6 500 francs, payable dans 15 jours."
  const invoiceMatch = text.match(/facture\s+(?:à|a)\s+(.+?)\s+pour\s+(.+)/i);
  if (invoiceMatch) {
    const customer = invoiceMatch[1].trim();
    let rest = invoiceMatch[2].trim();

    // clause d'échéance optionnelle, séparée par une virgule
    let dueInDays = null;
    const dueMatch = rest.match(/,?\s*payable\s+dans\s+(\d+)\s+jours?/i);
    if (dueMatch) {
      dueInDays = parseInt(dueMatch[1], 10);
      rest = rest.replace(dueMatch[0], '').trim();
    }

    // ligne complète : "<qté> <unité> de <produit> à <prix> francs"
    const lineMatch = rest.match(
      /(\d+(?:[.,]\d+)?)\s+([a-zàâçéèêëîïôûùüÿñæœ]+)\s+de\s+(.+?)\s+(?:à|a)\s+([\d\s.,]+)\s*(?:francs?|fcfa|f)\b/i,
    );

    if (lineMatch) {
      return {
        intent: 'CREATE_INVOICE',
        confidence: 0.9,
        requires_clarification: false,
        entities: {
          customer_query: customer,
          items: [
            {
              product_query: lineMatch[3].trim().replace(/\.$/, ''),
              quantity: parseAmount(lineMatch[1]),
              unit: lineMatch[2],
              unit_price: parseAmount(lineMatch[4]),
            },
          ],
          due_in_days: dueInDays,
        },
      };
    }

    // Produit mentionné mais SANS quantité -> ne jamais inventer une quantité.
    const productOnlyMatch = rest.match(/pour\s+(?:du|de la|des|de l['’])\s*(.+)/i) || rest.match(/^(.+)$/);
    const productGuess = (productOnlyMatch ? productOnlyMatch[1] : rest).replace(/[.?!]+$/, '').trim();

    return {
      intent: 'CREATE_INVOICE',
      confidence: 0.5,
      requires_clarification: true,
      clarification_question: `Combien de ${productGuess} souhaitez-vous facturer ?`,
      entities: { customer_query: customer, product_query: productGuess },
    };
  }

  // ---- CREATE_PURCHASE ----
  // "J'ai acheté 100 sacs de ciment à 4 800 francs chez Sénégal Matériaux."
  const purchaseMatch = text.match(
    /achet[ée]\s+(\d+(?:[.,]\d+)?)\s+([a-zàâçéèêëîïôûùüÿñæœ]+)\s+de\s+(.+?)\s+(?:à|a)\s+([\d\s.,]+)\s*(?:francs?|fcfa|f)\b(?:\s+chez\s+(.+))?/i,
  );
  if (purchaseMatch) {
    const supplierRaw = purchaseMatch[5] ? purchaseMatch[5].replace(/[.?!]+$/, '').trim() : null;
    return {
      intent: 'CREATE_PURCHASE',
      confidence: supplierRaw ? 0.9 : 0.7,
      requires_clarification: !supplierRaw,
      clarification_question: supplierRaw ? undefined : 'Chez quel fournisseur avez-vous acheté ?',
      entities: {
        product_query: purchaseMatch[3].trim(),
        quantity: parseAmount(purchaseMatch[1]),
        unit: purchaseMatch[2],
        unit_price: parseAmount(purchaseMatch[4]),
        supplier_query: supplierRaw,
      },
    };
  }

  // ---- CREATE_EXPENSE ----
  // "Enregistre 15 000 francs de carburant aujourd'hui."
  const expenseMatch = text.match(
    /enregistre\s+([\d\s.,]+)\s*(?:francs?|fcfa|f)\s+de\s+([a-zàâçéèêëîïôûùüÿñæœ]+)/i,
  );
  if (expenseMatch) {
    const isToday = /aujourd['’]hui/i.test(text);
    return {
      intent: 'CREATE_EXPENSE',
      confidence: 0.85,
      requires_clarification: false,
      entities: {
        amount: parseAmount(expenseMatch[1]),
        category: expenseMatch[2],
        date: isToday ? 'today' : null,
      },
    };
  }

  // ---- GET_REPORT (mode conversationnel, section 20) ----
  if (/comment\s+va\s+mon\s+commerce/i.test(text) || /^rapport\b/i.test(text)) {
    return {
      intent: 'GET_REPORT',
      confidence: 0.8,
      requires_clarification: false,
      entities: {},
    };
  }

  // ---- Rien reconnu ----
  return {
    intent: 'UNKNOWN',
    confidence: 0,
    requires_clarification: true,
    clarification_question: "Je n'ai pas compris. Pouvez-vous reformuler ?",
    entities: {},
  };
}

// ============================================================
// EXÉCUTION — cas tirés directement du prompt maître
// ============================================================

function assert(condition, label) {
  const status = condition ? 'PASS' : 'FAIL';
  console.log(`[${status}] ${label}`);
  if (!condition) process.exitCode = 1;
}

console.log('=== FAKTU — Extracteur d\'intention (règles) — exécution réelle ===\n');

console.log('--- Cas 1 (section 5) : facture complète avec échéance ---');
const r1 = extractIntent('Fais une facture à Mamadou pour 20 sacs de ciment à 6 500 francs, payable dans 15 jours.');
console.log(JSON.stringify(r1, null, 2));
assert(r1.intent === 'CREATE_INVOICE', 'intent = CREATE_INVOICE');
assert(r1.entities.customer_query === 'Mamadou', 'client = Mamadou');
assert(r1.entities.items[0].quantity === 20, 'quantité = 20');
assert(r1.entities.items[0].product_query === 'ciment', 'produit = ciment');
assert(r1.entities.items[0].unit_price === 6500, 'prix = 6500');
assert(r1.entities.due_in_days === 15, 'échéance = 15 jours');
assert(r1.requires_clarification === false, 'pas de clarification nécessaire');

console.log('\n--- Cas 2 (section 6) : facture SANS quantité -> clarification obligatoire ---');
const r2 = extractIntent('Fais une facture à Mamadou pour du ciment.');
console.log(JSON.stringify(r2, null, 2));
assert(r2.requires_clarification === true, 'clarification demandée (jamais d\'invention)');
assert(!!r2.clarification_question, 'question de clarification fournie');

console.log('\n--- Cas 3 (section 14) : achat avec fournisseur ---');
const r3 = extractIntent("J'ai acheté 100 sacs de ciment à 4 800 francs chez Sénégal Matériaux.");
console.log(JSON.stringify(r3, null, 2));
assert(r3.intent === 'CREATE_PURCHASE', 'intent = CREATE_PURCHASE');
assert(r3.entities.quantity === 100, 'quantité = 100');
assert(r3.entities.unit_price === 4800, 'prix = 4800');
assert(r3.entities.supplier_query === 'Sénégal Matériaux', 'fournisseur = Sénégal Matériaux');

console.log('\n--- Cas 4 (section 16) : dépense ---');
const r4 = extractIntent('Enregistre 15 000 francs de carburant aujourd\'hui.');
console.log(JSON.stringify(r4, null, 2));
assert(r4.intent === 'CREATE_EXPENSE', 'intent = CREATE_EXPENSE');
assert(r4.entities.amount === 15000, 'montant = 15000');
assert(r4.entities.category === 'carburant', 'catégorie = carburant');
assert(r4.entities.date === 'today', 'date = aujourd\'hui');

console.log('\n--- Cas 5 (section 20) : mode conversationnel ---');
const r5 = extractIntent('Comment va mon commerce ?');
console.log(JSON.stringify(r5, null, 2));
assert(r5.intent === 'GET_REPORT', 'intent = GET_REPORT');

console.log('\n--- Cas 6 : phrase non reconnue -> jamais d\'invention ---');
const r6 = extractIntent('Quel temps fait-il à Thiès ?');
console.log(JSON.stringify(r6, null, 2));
assert(r6.intent === 'UNKNOWN', 'intent = UNKNOWN (honnête plutôt que faux positif)');
assert(r6.requires_clarification === true, 'demande de reformulation');

console.log('\n=== Fin des tests ===');
console.log(process.exitCode === 1 ? '\n>>> AU MOINS UN TEST A ÉCHOUÉ <<<' : '\n>>> TOUS LES TESTS SONT PASSÉS <<<');

module.exports = { extractIntent };
FAKTU_EOF_MARKER_9f3a
cat > "faktu/prototype/test-ai-live.js" << 'FAKTU_EOF_MARKER_9f3a'
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
FAKTU_EOF_MARKER_9f3a
cat > "faktu/prototype/vertical-slice-demo.js" << 'FAKTU_EOF_MARKER_9f3a'
'use strict';

/**
 * FAKTU — Prototype de validation de la boucle centrale (Node.js, sans dépendance).
 *
 * POURQUOI CE FICHIER EXISTE :
 * Cet environnement n'a pas d'accès réseau (donc pas de `npm install`,
 * pas de PostgreSQL, pas de Flutter). Le vrai code cible se trouve dans
 * apps/api/ (NestJS + PostgreSQL) mais n'a PAS pu être exécuté ici.
 *
 * Ce script reproduit fidèlement la MÊME logique métier (preview,
 * confirmation, décrément de stock, paiements, doublons...) avec un
 * store en mémoire, pour pouvoir réellement l'EXÉCUTER et vérifier
 * que la boucle centrale de FAKTU fonctionne comme spécifié
 * (section 41 — TESTS du prompt maître).
 *
 * Statut réel : CE fichier est testé (exécuté ci-dessous, résultats
 * imprimés). Le code NestJS/PostgreSQL équivalent est CODÉ mais NON
 * exécuté/testé faute d'environnement (voir STATUT.md).
 */

let idCounter = 1;
const nextId = () => `id-${idCounter++}`;

const db = {
  customers: [],
  products: [],
  stock: {},        // product_id -> quantity
  invoices: [],
  payments: [],
  auditLogs: [],
};

function seed() {
  const customer = { id: nextId(), name: 'Mamadou Ndiaye' };
  const product = { id: nextId(), name: 'Ciment 50 kg', sale_price: 6500, tax_rate: 0 };
  db.customers.push(customer);
  db.products.push(product);
  db.stock[product.id] = 100;
  return { customer, product };
}

function findCustomerByName(name) {
  return db.customers.filter((c) => c.name.toLowerCase().includes(name.toLowerCase()));
}

function findProductByName(name) {
  return db.products.filter((p) => p.name.toLowerCase().includes(name.toLowerCase()));
}

// ---- preview (ne touche jamais au stock) ----
function previewInvoice({ customer_query, items }) {
  const customers = findCustomerByName(customer_query);
  if (customers.length === 0) return { error: 'CUSTOMER_NOT_FOUND', customer_query };
  if (customers.length > 1) return { error: 'AMBIGUOUS_CUSTOMER', candidates: customers };
  const customer = customers[0];

  const resolvedItems = [];
  for (const item of items) {
    const products = findProductByName(item.product_query);
    if (products.length === 0) return { error: 'PRODUCT_NOT_FOUND', query: item.product_query };
    if (products.length > 1) return { error: 'AMBIGUOUS_PRODUCT', candidates: products };
    const product = products[0];
    const available = db.stock[product.id] ?? 0;
    if (available < item.quantity) {
      return {
        error: 'INSUFFICIENT_STOCK',
        message: `Il reste seulement ${available} ${product.name} alors que vous en demandez ${item.quantity}.`,
      };
    }
    resolvedItems.push({
      product_id: product.id,
      description: product.name,
      quantity: item.quantity,
      unit_price: item.unit_price ?? product.sale_price,
    });
  }

  const subtotal = resolvedItems.reduce((s, i) => s + i.quantity * i.unit_price, 0);
  const total = subtotal;

  const invoice = {
    id: nextId(),
    status: 'PENDING_CONFIRMATION',
    customer_id: customer.id,
    items: resolvedItems,
    subtotal,
    total,
    amount_paid: 0,
    balance_due: total,
    number: null,
  };
  db.invoices.push(invoice);

  return { preview_id: invoice.id, requires_confirmation: true, customer, items: resolvedItems, subtotal, total };
}

// ---- confirm (transaction : décrément stock + numérotation + audit) ----
let invoiceSeq = 0;
function confirmInvoice({ preview_id, confirmation }) {
  const invoice = db.invoices.find((i) => i.id === preview_id);
  if (!invoice) return { error: 'NOT_FOUND' };

  if (!confirmation) {
    invoice.status = 'CANCELLED';
    return { status: 'CANCELLED' };
  }

  if (invoice.status !== 'PENDING_CONFIRMATION') {
    return { error: 'INVOICE_NOT_PENDING', status: invoice.status };
  }

  // re-vérification du stock (peut avoir changé depuis la preview)
  for (const item of invoice.items) {
    const available = db.stock[item.product_id] ?? 0;
    if (available < item.quantity) {
      return { error: 'INSUFFICIENT_STOCK', product_id: item.product_id, available, requested: item.quantity };
    }
  }

  for (const item of invoice.items) {
    db.stock[item.product_id] -= item.quantity;
  }

  invoiceSeq += 1;
  invoice.number = `FAC-2026-${String(invoiceSeq).padStart(6, '0')}`;
  invoice.status = 'ISSUED';

  db.auditLogs.push({ action: 'CREATE_INVOICE', entity_id: invoice.id, at: new Date().toISOString() });

  return invoice;
}

// ---- paiement (avec idempotence) ----
function recordPayment({ invoice_id, amount, idempotency_key }) {
  const existing = db.payments.find((p) => p.idempotency_key === idempotency_key);
  if (existing) return { duplicate: true, payment: existing };

  const invoice = db.invoices.find((i) => i.id === invoice_id);
  if (!invoice) return { error: 'INVOICE_NOT_FOUND' };

  if (amount > invoice.balance_due) {
    return {
      error: 'PAYMENT_EXCEEDS_BALANCE',
      message: `Le paiement dépasse le solde de ${amount - invoice.balance_due} FCFA.`,
    };
  }

  const payment = { id: nextId(), invoice_id, amount, idempotency_key };
  db.payments.push(payment);

  invoice.amount_paid += amount;
  invoice.balance_due -= amount;
  invoice.status = invoice.balance_due <= 0 ? 'PAID' : 'PARTIALLY_PAID';

  db.auditLogs.push({ action: 'RECORD_PAYMENT', entity_id: invoice.id, at: new Date().toISOString() });

  return { duplicate: false, payment, invoice };
}

// ============================================================
// EXÉCUTION DES TESTS (section 41 du prompt maître)
// ============================================================

function assert(condition, label) {
  const status = condition ? 'PASS' : 'FAIL';
  console.log(`[${status}] ${label}`);
  if (!condition) process.exitCode = 1;
}

console.log('=== FAKTU — Vertical slice demo (exécution réelle) ===\n');

const { customer, product } = seed();
console.log(`Seed : client="${customer.name}", produit="${product.name}", stock initial=${db.stock[product.id]}\n`);

console.log('--- TEST PRINCIPAL ---');
const preview = previewInvoice({
  customer_query: 'Mamadou',
  items: [{ product_query: 'Ciment', quantity: 20, unit_price: 6500 }],
});
assert(preview.total === 130000, `Total calculé = ${preview.total} (attendu 130000)`);

const issued = confirmInvoice({ preview_id: preview.preview_id, confirmation: true });
assert(issued.status === 'ISSUED', `Statut facture = ${issued.status} (attendu ISSUED)`);
assert(db.stock[product.id] === 80, `Stock après vente = ${db.stock[product.id]} (attendu 80)`);
assert(!!issued.number, `Numéro de facture généré = ${issued.number}`);

console.log('\n--- TEST ANNULATION ---');
const preview2 = previewInvoice({ customer_query: 'Mamadou', items: [{ product_query: 'Ciment', quantity: 5 }] });
const stockBefore = db.stock[product.id];
const cancelled = confirmInvoice({ preview_id: preview2.preview_id, confirmation: false });
assert(cancelled.status === 'CANCELLED', `Statut = ${cancelled.status} (attendu CANCELLED)`);
assert(db.stock[product.id] === stockBefore, `Stock inchangé après annulation = ${db.stock[product.id]}`);

console.log('\n--- TEST STOCK (insuffisant) ---');
const previewStock = previewInvoice({ customer_query: 'Mamadou', items: [{ product_query: 'Ciment', quantity: 9999 }] });
assert(previewStock.error === 'INSUFFICIENT_STOCK', `Erreur retournée = ${previewStock.error}`);

console.log('\n--- TEST CLIENT (inconnu) ---');
const previewUnknown = previewInvoice({ customer_query: 'Ibrahima', items: [{ product_query: 'Ciment', quantity: 1 }] });
assert(previewUnknown.error === 'CUSTOMER_NOT_FOUND', `Erreur retournée = ${previewUnknown.error}`);

console.log('\n--- TEST PAIEMENT (partiel) ---');
const pay1 = recordPayment({ invoice_id: issued.id, amount: 50000, idempotency_key: 'pay-001' });
assert(pay1.invoice.balance_due === 80000, `Solde après 50000 payé = ${pay1.invoice.balance_due} (attendu 80000)`);
assert(pay1.invoice.status === 'PARTIALLY_PAID', `Statut = ${pay1.invoice.status}`);

console.log('\n--- TEST PAIEMENT FINAL ---');
const pay2 = recordPayment({ invoice_id: issued.id, amount: 80000, idempotency_key: 'pay-002' });
assert(pay2.invoice.balance_due === 0, `Solde final = ${pay2.invoice.balance_due} (attendu 0)`);
assert(pay2.invoice.status === 'PAID', `Statut = ${pay2.invoice.status} (attendu PAID)`);

console.log('\n--- TEST DOUBLON (même paiement renvoyé deux fois) ---');
const pay2Retry = recordPayment({ invoice_id: issued.id, amount: 80000, idempotency_key: 'pay-002' });
assert(pay2Retry.duplicate === true, `Doublon détecté = ${pay2Retry.duplicate}`);
assert(db.payments.filter((p) => p.idempotency_key === 'pay-002').length === 1, `Un seul paiement enregistré pour pay-002`);

console.log('\n--- TEST PAIEMENT SUPÉRIEUR (dépassement) ---');
const preview3 = previewInvoice({ customer_query: 'Mamadou', items: [{ product_query: 'Ciment', quantity: 1 }] });
const issued3 = confirmInvoice({ preview_id: preview3.preview_id, confirmation: true });
const overpay = recordPayment({ invoice_id: issued3.id, amount: 999999, idempotency_key: 'pay-over' });
assert(overpay.error === 'PAYMENT_EXCEEDS_BALANCE', `Dépassement détecté et bloqué = ${overpay.error}`);

console.log('\n=== Fin des tests ===');
console.log(process.exitCode === 1 ? '\n>>> AU MOINS UN TEST A ÉCHOUÉ <<<' : '\n>>> TOUS LES TESTS SONT PASSÉS <<<');
FAKTU_EOF_MARKER_9f3a
echo "Terminé : le dossier faktu/ est reconstruit."

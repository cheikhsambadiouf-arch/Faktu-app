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

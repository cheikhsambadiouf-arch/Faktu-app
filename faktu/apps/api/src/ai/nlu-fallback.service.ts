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

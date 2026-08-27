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

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

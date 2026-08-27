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

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

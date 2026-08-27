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

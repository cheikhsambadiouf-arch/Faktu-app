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

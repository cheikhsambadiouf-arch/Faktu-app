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

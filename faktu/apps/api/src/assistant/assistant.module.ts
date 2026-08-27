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

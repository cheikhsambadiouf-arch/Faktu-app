import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { CustomersModule } from './customers/customers.module';
import { ProductsModule } from './products/products.module';
import { InvoicesModule } from './invoices/invoices.module';
import { PaymentsModule } from './payments/payments.module';
import { AiModule } from './ai/ai.module';
import { VoiceModule } from './voice/voice.module';
import { AssistantModule } from './assistant/assistant.module';

@Module({
  imports: [
    DatabaseModule,
    CustomersModule,
    ProductsModule,
    InvoicesModule,
    PaymentsModule,
    AiModule,
    VoiceModule,
    AssistantModule,
  ],
})
export class AppModule {}

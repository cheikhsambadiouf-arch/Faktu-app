import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { BusinessId } from '../common/business.decorator';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  create(@BusinessId() businessId: string, @Body() dto: CreatePaymentDto) {
    return this.paymentsService.create(businessId, dto);
  }

  @Get('by-invoice/:invoiceId')
  findByInvoice(@BusinessId() businessId: string, @Param('invoiceId') invoiceId: string) {
    return this.paymentsService.findByInvoice(businessId, invoiceId);
  }
}

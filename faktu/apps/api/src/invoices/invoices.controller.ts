import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { PreviewInvoiceDto } from './dto/preview-invoice.dto';
import { ConfirmInvoiceDto } from './dto/confirm-invoice.dto';
import { BusinessId } from '../common/business.decorator';

@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Post('preview')
  preview(@BusinessId() businessId: string, @Body() dto: PreviewInvoiceDto) {
    return this.invoicesService.preview(businessId, dto);
  }

  @Post()
  confirm(@BusinessId() businessId: string, @Body() dto: ConfirmInvoiceDto) {
    return this.invoicesService.confirm(businessId, dto);
  }

  @Get()
  findAll(@BusinessId() businessId: string) {
    return this.invoicesService.findAll(businessId);
  }

  @Get(':id')
  findOne(@BusinessId() businessId: string, @Param('id') id: string) {
    return this.invoicesService.findOne(businessId, id);
  }
}

import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { BusinessId } from '../common/business.decorator';

@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post()
  create(@BusinessId() businessId: string, @Body() dto: CreateCustomerDto) {
    return this.customersService.create(businessId, dto);
  }

  @Get()
  findAll(@BusinessId() businessId: string, @Query('search') search?: string) {
    return this.customersService.findAll(businessId, search);
  }

  @Get(':id')
  findOne(@BusinessId() businessId: string, @Param('id') id: string) {
    return this.customersService.findOne(businessId, id);
  }
}

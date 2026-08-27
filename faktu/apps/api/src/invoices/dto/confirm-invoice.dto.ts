import { IsBoolean, IsNotEmpty, IsString } from 'class-validator';

export class ConfirmInvoiceDto {
  @IsString()
  @IsNotEmpty()
  preview_id: string;

  @IsBoolean()
  confirmation: boolean;
}

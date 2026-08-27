import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class PreviewInvoiceItemDto {
  @IsString()
  @IsNotEmpty()
  product_query: string;

  @IsNumber()
  @IsPositive()
  quantity: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  unit_price?: number; // si absent, on utilise le prix de vente du produit

  @IsOptional()
  @IsNumber()
  @Min(0)
  discount?: number;
}

export class PreviewInvoiceDto {
  // customer_id a priorité sur customer_query si les deux sont fournis
  @IsOptional()
  @IsString()
  customer_id?: string;

  @IsOptional()
  @IsString()
  customer_query?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PreviewInvoiceItemDto)
  items: PreviewInvoiceItemDto[];

  @IsOptional()
  @IsInt()
  due_in_days?: number;
}

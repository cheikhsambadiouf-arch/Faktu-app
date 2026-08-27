import { IsIn, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';

export class CreatePaymentDto {
  @IsString()
  @IsNotEmpty()
  invoice_id: string;

  @IsNumber()
  @IsPositive()
  amount: number;

  @IsIn(['CASH', 'MOBILE_MONEY', 'BANK_TRANSFER', 'CARD', 'OTHER'])
  method: string;

  @IsOptional()
  @IsString()
  reference?: string;

  // Clé fournie par le client (app mobile) pour éviter les doublons
  // si la requête est renvoyée deux fois (mauvaise connexion, retry...).
  // Voir section 41 "TEST DOUBLON".
  @IsString()
  @IsNotEmpty()
  idempotency_key: string;
}

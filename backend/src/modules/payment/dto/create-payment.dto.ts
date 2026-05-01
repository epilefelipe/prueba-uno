import { IsString, IsNumber, IsNotEmpty, IsOptional, IsPositive, MaxLength } from 'class-validator';

export class CreatePaymentDto {
  @IsString()
  @IsNotEmpty()
  merchantId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  externalOrderId: string;

  @IsNumber()
  @IsPositive()
  amount: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(3)
  currency: string;

  @IsString()
  @IsNotEmpty()
  cardToken: string;

  @IsString()
  @IsOptional()
  idempotencyKey?: string;
}

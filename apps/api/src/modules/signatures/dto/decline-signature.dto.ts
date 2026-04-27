import { IsIn, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class DeclineSignatureBodyDto {
  @IsUUID()
  signerId!: string;

  @IsString()
  @IsNotEmpty()
  reason!: string;
}

export class SendOtpDto {
  @IsUUID()
  signerId!: string;

  @IsOptional()
  @IsIn(['email', 'whatsapp'])
  channel?: 'email' | 'whatsapp';
}

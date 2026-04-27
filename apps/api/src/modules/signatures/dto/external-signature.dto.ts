import { Type } from 'class-transformer';
import { IsIn, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
import { SignatureZoneDto } from './signature-zone.dto';

export class ExternalTokenBodyDto {
  @IsString()
  @IsNotEmpty()
  token!: string;
}

export class ExternalOtpBodyDto extends ExternalTokenBodyDto {
  @IsOptional()
  @IsIn(['email', 'whatsapp'])
  channel?: 'email' | 'whatsapp';

  @IsOptional()
  @IsString()
  phone?: string;
}

export class ExternalSignBodyDto extends ExternalTokenBodyDto {
  @IsString()
  @IsNotEmpty()
  otpCode!: string;

  @IsOptional()
  @IsString()
  signatureDataUrl?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => SignatureZoneDto)
  signatureZone?: SignatureZoneDto;
}

export class ExternalDeclineBodyDto extends ExternalTokenBodyDto {
  @IsString()
  @IsNotEmpty()
  reason!: string;
}

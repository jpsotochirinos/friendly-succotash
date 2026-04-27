import { Type } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, IsUUID, ValidateNested } from 'class-validator';
import { SignatureZoneDto } from './signature-zone.dto';

export class SignSignatureBodyDto {
  @IsUUID()
  signerId!: string;

  @IsString()
  @IsNotEmpty()
  otpCode!: string;

  /** For external signers drawing on canvas (data URL PNG). */
  @IsOptional()
  @IsString()
  signatureDataUrl?: string;

  /** Chosen on the sign view (PDF user space, bottom-left origin). Omitted: use signer's stored zone. */
  @IsOptional()
  @ValidateNested()
  @Type(() => SignatureZoneDto)
  signatureZone?: SignatureZoneDto;
}

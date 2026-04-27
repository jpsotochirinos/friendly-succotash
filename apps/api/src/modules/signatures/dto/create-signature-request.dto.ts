import { Type } from 'class-transformer';
import {
  IsArray,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { SignatureMode } from '@tracker/shared';
import { SignatureZoneDto } from './signature-zone.dto';

export class CreateSignerDto {
  @ValidateIf((o) => !o.externalEmail && !o.clientId)
  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsOptional()
  @IsUUID()
  clientId?: string;

  @ValidateIf((o) => !o.userId && !o.clientId)
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  externalName?: string;

  @ValidateIf((o) => !o.userId && !o.clientId)
  @IsOptional()
  @IsEmail()
  externalEmail?: string;

  @IsOptional()
  @IsString()
  externalPhone?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => SignatureZoneDto)
  signatureZone?: SignatureZoneDto;
}

export class CreateSignatureRequestDto {
  @IsUUID()
  documentId!: string;

  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsEnum(SignatureMode)
  mode!: SignatureMode;

  @IsOptional()
  @IsString()
  message?: string;

  /** ISO date — default set in service if omitted */
  @IsOptional()
  @IsString()
  expiresAt?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSignerDto)
  signers!: CreateSignerDto[];
}

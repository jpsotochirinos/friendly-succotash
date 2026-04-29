import { IsEmail, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import type { ClientKind } from '@tracker/shared';

export class CreateClientDto {
  @IsString()
  @MaxLength(500)
  name!: string;

  @IsOptional()
  @IsIn(['unknown', 'natural', 'legal'])
  clientKind?: ClientKind;

  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  documentId?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

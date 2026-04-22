import { IsEmail, IsEnum, IsInt, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { TrackablePartyRole } from '@tracker/shared';

export class CreateTrackablePartyDto {
  @IsEnum(TrackablePartyRole)
  role!: TrackablePartyRole;

  @IsString()
  @MinLength(1)
  @MaxLength(500)
  partyName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  documentId?: string;

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
  notes?: string;

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

export class UpdateTrackablePartyDto {
  @IsOptional()
  @IsEnum(TrackablePartyRole)
  role?: TrackablePartyRole;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  partyName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  documentId?: string;

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
  notes?: string;

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

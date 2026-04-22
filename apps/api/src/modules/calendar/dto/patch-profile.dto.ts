import { IsDateString, IsOptional } from 'class-validator';

export class PatchProfileBirthDateDto {
  @IsDateString()
  @IsOptional()
  birthDate?: string | null;
}

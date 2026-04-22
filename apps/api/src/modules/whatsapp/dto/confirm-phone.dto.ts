import { Transform } from 'class-transformer';
import { IsString, Length, Matches } from 'class-validator';

export class ConfirmPhoneDto {
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : String(value ?? '').trim(),
  )
  @IsString()
  @Length(6, 6)
  @Matches(/^\d{6}$/)
  code!: string;
}

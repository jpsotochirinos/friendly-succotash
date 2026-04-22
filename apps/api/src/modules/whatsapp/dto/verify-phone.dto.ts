import { IsString, Matches, MinLength } from 'class-validator';

export class VerifyPhoneDto {
  @IsString()
  @MinLength(8)
  /** E.164 preferido, ej. +51987654321 */
  @Matches(/^\+[1-9]\d{7,14}$/, { message: 'phoneNumber must be E.164 (+country...)' })
  phoneNumber!: string;
}

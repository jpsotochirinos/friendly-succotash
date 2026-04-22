import { IsString, MaxLength, MinLength } from 'class-validator';

export class SendMessageDto {
  @IsString()
  @MinLength(8)
  to!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(4096)
  body!: string;
}

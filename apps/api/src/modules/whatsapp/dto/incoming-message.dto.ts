import { IsObject, IsOptional } from 'class-validator';

/** Solo para pruebas; el webhook real usa body crudo del proveedor. */
export class IncomingMessageDto {
  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>;
}

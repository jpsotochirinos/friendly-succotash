import { IsArray, IsOptional, IsString, IsObject, IsUUID } from 'class-validator';

export class AssistantChatDto {
  @IsArray()
  messages!: unknown[];

  @IsOptional()
  @IsObject()
  context?: Record<string, unknown>;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  confirmedToolCallIds?: string[];

  @IsOptional()
  @IsUUID()
  threadId?: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  attachmentIds?: string[];
}

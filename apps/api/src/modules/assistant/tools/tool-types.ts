import type { z } from 'zod';

export interface AssistantToolContext {
  userId: string;
  organizationId: string;
  permissions: string[];
  /** Canal del chat (tools pueden adaptar comportamiento, p. ej. adjunto vs link web). */
  channel?: 'web' | 'whatsapp';
}

export interface ToolDefinition {
  name: string;
  description: string;
  mutation: boolean;
  /** If null, any authenticated user. If string[], user must have any of these. */
  requiredPermissions: string[] | null;
  schema: z.ZodTypeAny;
  run: (ctx: AssistantToolContext, args: unknown) => Promise<unknown>;
}

export function hasToolPermission(
  ctx: AssistantToolContext,
  required: string[] | null,
): boolean {
  if (!required || required.length === 0) return true;
  return required.some((p) => ctx.permissions.includes(p));
}

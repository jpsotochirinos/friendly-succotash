import { PlanTier } from '../enums/index';

export type ImportTierCapabilities = {
  maxBatchBytes: number;
  maxDocumentsPerBatch: number;
  allowOcr: boolean;
  allowLlm: boolean;
  allowCloudOcr: boolean;
  allowDesktopChannel: boolean;
  allowAssistedChannel: boolean;
  /** Solo reglas + embeddings locales (sin LLM). */
  embeddingsOnly: boolean;
};

const FREE: ImportTierCapabilities = {
  maxBatchBytes: 500 * 1024 * 1024, // 500 MB
  maxDocumentsPerBatch: 300,
  allowOcr: false,
  allowLlm: false,
  allowCloudOcr: false,
  allowDesktopChannel: false,
  allowAssistedChannel: false,
  embeddingsOnly: true,
};

const BASIC: ImportTierCapabilities = {
  maxBatchBytes: 10 * 1024 * 1024 * 1024, // 10 GB
  maxDocumentsPerBatch: 5000,
  allowOcr: true,
  allowLlm: true,
  allowCloudOcr: false,
  allowDesktopChannel: true,
  allowAssistedChannel: false,
  embeddingsOnly: false,
};

const PRO: ImportTierCapabilities = {
  maxBatchBytes: Number.MAX_SAFE_INTEGER,
  maxDocumentsPerBatch: Number.MAX_SAFE_INTEGER,
  allowOcr: true,
  allowLlm: true,
  allowCloudOcr: true,
  allowDesktopChannel: true,
  allowAssistedChannel: true,
  embeddingsOnly: false,
};

export function getImportCapabilities(tier: PlanTier): ImportTierCapabilities {
  switch (tier) {
    case PlanTier.BASIC:
      return BASIC;
    case PlanTier.PRO:
      return PRO;
    case PlanTier.FREE:
    default:
      return FREE;
  }
}

export function assertBatchWithinTier(
  tier: PlanTier,
  totalBytes: number,
  docCount: number,
): { ok: true } | { ok: false; reason: string } {
  const cap = getImportCapabilities(tier);
  if (totalBytes > cap.maxBatchBytes) {
    return {
      ok: false,
      reason: `El lote supera el límite de ${Math.floor(cap.maxBatchBytes / (1024 * 1024))} MB para su plan.`,
    };
  }
  if (docCount > cap.maxDocumentsPerBatch) {
    return {
      ok: false,
      reason: `El lote supera el máximo de ${cap.maxDocumentsPerBatch} documentos para su plan.`,
    };
  }
  return { ok: true };
}

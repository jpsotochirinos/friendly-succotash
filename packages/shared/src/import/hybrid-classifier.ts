import type { ImportTierCapabilities } from './tier-gating';
import { classifyByRules } from './classify-rules';
import type { ImportClassification } from './types';

export interface HybridClassifyInput {
  filename: string;
  textPreview: string;
  tier: ImportTierCapabilities;
}

/**
 * Clasificador híbrido: reglas → (embeddings/LLM reservados para servicios externos).
 * En free tier: solo reglas; sin OCR los PDFs escaneados quedarán sin clasificar fuerte.
 */
export function hybridClassify(input: HybridClassifyInput): ImportClassification {
  const rules = classifyByRules(input.filename, input.textPreview);
  if (rules) {
    return {
      actionType: rules.actionType,
      kind: rules.kind,
      confidence: rules.confidence,
      method: 'rules',
    };
  }

  if (input.tier.embeddingsOnly) {
    return {
      confidence: 0.35,
      method: 'rules',
      kind: 'Sin clasificar',
    };
  }

  // Placeholder para embeddings + LLM (implementado en worker con llamadas HTTP opcionales)
  return {
    confidence: 0.4,
    method: 'embeddings',
    kind: 'Pendiente revisión',
  };
}

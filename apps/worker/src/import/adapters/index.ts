import type { ImportDomainAdapter } from './types';
import { defaultImportAdapter } from './default.adapter';
import { assistedStubAdapter } from './assisted-stub.adapter';

const registry = new Map<string, ImportDomainAdapter>([
  [defaultImportAdapter.id, defaultImportAdapter],
  [assistedStubAdapter.id, assistedStubAdapter],
]);

export function resolveImportAdapter(config?: Record<string, unknown> | null): ImportDomainAdapter {
  const id = (config?.adapterId as string) || 'default';
  return registry.get(id) ?? defaultImportAdapter;
}

export type { ImportDomainAdapter } from './types';

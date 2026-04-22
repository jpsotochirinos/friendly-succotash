import type { ImportDomainAdapter } from './types';

/** Placeholder para proyectos asistidos: sustituir por adaptador por cliente. */
export const assistedStubAdapter: ImportDomainAdapter = {
  id: 'assisted-stub',
  refineTrackableKey(sourcePath) {
    if (sourcePath.includes('EXP-')) {
      const m = sourcePath.match(/EXP-[\w-]+/i);
      return m ? m[0] : undefined;
    }
    return undefined;
  },
};

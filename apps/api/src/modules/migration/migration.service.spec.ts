import { PlanTier } from '@tracker/shared';
import { describe, expect, it, vi } from 'vitest';
import { MigrationService } from './migration.service';

describe('MigrationService', () => {
  it('profileFolderBatch returns folders and overall', async () => {
    const em = {
      findOne: vi
        .fn()
        .mockResolvedValueOnce({
          id: 'b1',
          name: 'Test',
          status: 'created',
          config: {},
        })
        .mockResolvedValueOnce({ planTier: PlanTier.FREE }),
    } as any;
    const llm = {} as any;
    const svc = new MigrationService(em, llm);
    const out = await svc.profileFolderBatch(
      {
        batchId: '00000000-0000-4000-8000-000000000001',
        folders: [
          {
            relPath: 'exp1',
            sampleSnippets: [{ filename: 'a.pdf', text: 'Exp. N° 2024-1234' }],
          },
        ],
      },
      '00000000-0000-4000-8000-000000000099',
    );
    expect(out.folders).toHaveLength(1);
    expect(out.folders[0].relPath).toBe('exp1');
    expect(out.overall.dominantKinds.length).toBeGreaterThanOrEqual(0);
  });
});

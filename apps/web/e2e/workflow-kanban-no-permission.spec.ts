import { test } from '@playwright/test';

/**
 * Placeholder: comprobar usuario sin workflow:review no puede mover a DONE
 * requiere segundo usuario seed con rol limitado. Marcar como skip hasta datos de prueba.
 */
test.describe('Workflow Kanban permissions', () => {
  test.skip('user without workflow:review cannot complete review transitions', async () => {
    // Implement when a seeded restricted user exists
  });
});

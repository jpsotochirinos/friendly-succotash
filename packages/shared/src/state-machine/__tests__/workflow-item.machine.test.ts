import { describe, it, expect } from 'vitest';
import { WorkflowItemStateMachine } from '../workflow-item.machine';
import { WorkflowItemStatus } from '../../enums/index';

describe('WorkflowItemStateMachine', () => {
  it('should start with PENDING', () => {
    expect(WorkflowItemStateMachine.initialState).toBe(WorkflowItemStatus.PENDING);
  });

  it('should allow PENDING -> ACTIVE', () => {
    expect(
      WorkflowItemStateMachine.canTransition(
        WorkflowItemStatus.PENDING,
        WorkflowItemStatus.ACTIVE,
      ),
    ).toBe(true);
  });

  it('should allow PENDING -> SKIPPED', () => {
    expect(
      WorkflowItemStateMachine.canTransition(
        WorkflowItemStatus.PENDING,
        WorkflowItemStatus.SKIPPED,
      ),
    ).toBe(true);
  });

  it('should NOT allow PENDING -> CLOSED directly', () => {
    expect(
      WorkflowItemStateMachine.canTransition(
        WorkflowItemStatus.PENDING,
        WorkflowItemStatus.CLOSED,
      ),
    ).toBe(false);
  });

  it('should allow REJECTED -> IN_PROGRESS (rework)', () => {
    expect(
      WorkflowItemStateMachine.canTransition(
        WorkflowItemStatus.REJECTED,
        WorkflowItemStatus.IN_PROGRESS,
      ),
    ).toBe(true);
  });

  it('should return available transitions from IN_PROGRESS', () => {
    const transitions = WorkflowItemStateMachine.getAvailableTransitions(
      WorkflowItemStatus.IN_PROGRESS,
    );
    expect(transitions).toHaveLength(1);
    expect(transitions[0].to).toBe(WorkflowItemStatus.UNDER_REVIEW);
  });

  it('should return next states from UNDER_REVIEW', () => {
    const nextStates = WorkflowItemStateMachine.getNextStates(
      WorkflowItemStatus.UNDER_REVIEW,
    );
    expect(nextStates).toContain(WorkflowItemStatus.VALIDATED);
    expect(nextStates).toContain(WorkflowItemStatus.REJECTED);
  });

  it('should require permission for validate transition', () => {
    const transitions = WorkflowItemStateMachine.getAvailableTransitions(
      WorkflowItemStatus.UNDER_REVIEW,
    );
    const validateTransition = transitions.find(
      (t) => t.to === WorkflowItemStatus.VALIDATED,
    );
    expect(validateTransition?.requiredPermission).toBe('workflow:validate');
  });
});

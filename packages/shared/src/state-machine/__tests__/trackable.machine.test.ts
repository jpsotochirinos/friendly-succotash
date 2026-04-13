import { describe, it, expect } from 'vitest';
import { TrackableStateMachine } from '../trackable.machine';
import { TrackableStatus } from '../../enums/index';

describe('TrackableStateMachine', () => {
  it('should allow full happy path', () => {
    const path = [
      TrackableStatus.CREATED,
      TrackableStatus.ACTIVE,
      TrackableStatus.UNDER_REVIEW,
      TrackableStatus.COMPLETED,
      TrackableStatus.ARCHIVED,
    ];

    for (let i = 0; i < path.length - 1; i++) {
      expect(TrackableStateMachine.canTransition(path[i], path[i + 1])).toBe(true);
    }
  });

  it('should allow rejection loop', () => {
    expect(
      TrackableStateMachine.canTransition(
        TrackableStatus.UNDER_REVIEW,
        TrackableStatus.ACTIVE,
      ),
    ).toBe(true);
  });

  it('should NOT allow skipping from CREATED to COMPLETED', () => {
    expect(
      TrackableStateMachine.canTransition(
        TrackableStatus.CREATED,
        TrackableStatus.COMPLETED,
      ),
    ).toBe(false);
  });
});

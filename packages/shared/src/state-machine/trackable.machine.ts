import { TrackableStatus } from '../enums/index';
import { createStateMachine, type Transition } from './types';

const transitions: Transition<TrackableStatus>[] = [
  { from: TrackableStatus.CREATED, to: TrackableStatus.ACTIVE, label: 'Activate' },
  { from: TrackableStatus.ACTIVE, to: TrackableStatus.UNDER_REVIEW, label: 'Submit for review' },
  { from: TrackableStatus.UNDER_REVIEW, to: TrackableStatus.COMPLETED, label: 'Approve', requiredPermission: 'workflow:validate' },
  { from: TrackableStatus.UNDER_REVIEW, to: TrackableStatus.ACTIVE, label: 'Reject', requiredPermission: 'workflow:reject' },
  { from: TrackableStatus.COMPLETED, to: TrackableStatus.ARCHIVED, label: 'Archive' },
];

export const TrackableStateMachine = createStateMachine(TrackableStatus.CREATED, transitions);

import { DocumentReviewStatus } from '../enums/index';
import { createStateMachine, type Transition } from './types';

const transitions: Transition<DocumentReviewStatus>[] = [
  { from: DocumentReviewStatus.DRAFT, to: DocumentReviewStatus.IN_REVIEW, label: 'Submit for review' },
  { from: DocumentReviewStatus.IN_REVIEW, to: DocumentReviewStatus.APPROVED, label: 'Approve', requiredPermission: 'workflow:validate' },
  { from: DocumentReviewStatus.IN_REVIEW, to: DocumentReviewStatus.REVISION_NEEDED, label: 'Request revision' },
  { from: DocumentReviewStatus.REVISION_NEEDED, to: DocumentReviewStatus.DRAFT, label: 'Revise' },
  { from: DocumentReviewStatus.APPROVED, to: DocumentReviewStatus.SUBMITTED, label: 'Submit final' },
];

export const DocumentStateMachine = createStateMachine(DocumentReviewStatus.DRAFT, transitions);

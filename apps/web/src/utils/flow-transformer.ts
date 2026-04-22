import type { Node, Edge } from '@vue-flow/core';

interface WorkflowItem {
  id: string;
  parentId?: string | null;
  title: string;
  kind?: string | null;
  /** State key (same as legacy `status` in API responses). */
  stateKey?: string;
  status: string;
  assignedTo?: { id: string; firstName?: string; lastName?: string; email: string } | null | undefined;
  startDate?: string | null;
  dueDate?: string | null;
  metadata?: Record<string, unknown>;
  depth: number;
  sortOrder: number;
  requiresDocument?: boolean;
  actionType?: string;
  isLegalDeadline?: boolean;
  accentColor?: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  pending: '#94a3b8',
  active: '#3b82f6',
  in_progress: '#f59e0b',
  under_review: '#8b5cf6',
  validated: '#10b981',
  closed: '#22c55e',
  skipped: '#6b7280',
  rejected: '#ef4444',
};

/** Aplana árbol anidado (children) a lista con parentId para el grafo. */
export function flattenWorkflowTree(
  nodes: Array<WorkflowItem & { children?: WorkflowItem[] }>,
  parentId: string | null = null,
): WorkflowItem[] {
  const out: WorkflowItem[] = [];
  for (const n of nodes) {
    const { children, ...rest } = n as WorkflowItem & { children?: WorkflowItem[] };
    out.push({
      ...rest,
      parentId: parentId ?? (rest as any).parentId ?? null,
    });
    if (children?.length) {
      out.push(...flattenWorkflowTree(children as any, n.id));
    }
  }
  return out;
}

export function workflowItemsToFlowElements(
  items: WorkflowItem[],
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = items.map((item) => {
    const sk = item.stateKey ?? item.status;
    return {
    id: item.id,
    type: 'default',
    position: { x: 0, y: 0 },
    data: {
      label: item.title,
      status: sk,
      statusColor: STATUS_COLORS[sk] || '#94a3b8',
      assignedTo: item.assignedTo,
      dueDate: item.dueDate,
      kind: item.kind,
      requiresDocument: item.requiresDocument,
      actionType: item.actionType,
      depth: item.depth,
    },
  };
  });

  const edges: Edge[] = items
    .filter((item) => item.parentId)
    .map((item) => {
      const sk = item.stateKey ?? item.status;
      return {
      id: `e-${item.parentId}-${item.id}`,
      source: item.parentId!,
      target: item.id,
      animated: ['active', 'in_progress'].includes(sk),
      style: {
        stroke: STATUS_COLORS[sk] || '#94a3b8',
        strokeWidth: 2,
      },
    };
    });

  const groupedByParent = new Map<string, WorkflowItem[]>();
  items.forEach((item) => {
    const key = item.parentId || 'root';
    if (!groupedByParent.has(key)) groupedByParent.set(key, []);
    groupedByParent.get(key)!.push(item);
  });

  groupedByParent.forEach((siblings) => {
    const sorted = siblings.sort((a, b) => a.sortOrder - b.sortOrder);
    for (let i = 0; i < sorted.length - 1; i++) {
      edges.push({
        id: `e-seq-${sorted[i].id}-${sorted[i + 1].id}`,
        source: sorted[i].id,
        target: sorted[i + 1].id,
        type: 'smoothstep',
        animated: false,
        style: { stroke: '#d1d5db', strokeWidth: 1, strokeDasharray: '5 5' },
      });
    }
  });

  return { nodes, edges };
}

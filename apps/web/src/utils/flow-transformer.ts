import type { Node, Edge } from '@vue-flow/core';

interface WorkflowItem {
  id: string;
  parentId?: string | null;
  title: string;
  itemType: 'service' | 'task' | 'action';
  status: string;
  assignedTo?: { id: string; firstName?: string; lastName?: string; email: string } | null;
  dueDate?: string | null;
  depth: number;
  sortOrder: number;
  requiresDocument: boolean;
  actionType?: string;
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

export function workflowItemsToFlowElements(
  items: WorkflowItem[],
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = items.map((item) => ({
    id: item.id,
    type: item.itemType,
    position: { x: 0, y: 0 },
    data: {
      label: item.title,
      status: item.status,
      statusColor: STATUS_COLORS[item.status] || '#94a3b8',
      assignedTo: item.assignedTo,
      dueDate: item.dueDate,
      itemType: item.itemType,
      requiresDocument: item.requiresDocument,
      actionType: item.actionType,
      depth: item.depth,
    },
  }));

  const edges: Edge[] = items
    .filter((item) => item.parentId)
    .map((item) => ({
      id: `e-${item.parentId}-${item.id}`,
      source: item.parentId!,
      target: item.id,
      animated: ['active', 'in_progress'].includes(item.status),
      style: {
        stroke: STATUS_COLORS[item.status] || '#94a3b8',
        strokeWidth: 2,
      },
    }));

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

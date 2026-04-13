import dagre from '@dagrejs/dagre';
import type { Node, Edge } from '@vue-flow/core';
import { Position } from '@vue-flow/core';

const NODE_WIDTHS: Record<string, number> = {
  service: 280,
  task: 240,
  action: 200,
};

const NODE_HEIGHTS: Record<string, number> = {
  service: 80,
  task: 70,
  action: 60,
};

export function getLayoutedElements(
  nodes: Node[],
  edges: Edge[],
  direction: 'TB' | 'LR' = 'TB',
): { nodes: Node[]; edges: Edge[] } {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({
    rankdir: direction,
    nodesep: 40,
    ranksep: 80,
    marginx: 20,
    marginy: 20,
  });

  const isHorizontal = direction === 'LR';

  nodes.forEach((node) => {
    const width = NODE_WIDTHS[node.type || 'action'] || 200;
    const height = NODE_HEIGHTS[node.type || 'action'] || 60;
    dagreGraph.setNode(node.id, { width, height });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const pos = dagreGraph.node(node.id);
    const width = NODE_WIDTHS[node.type || 'action'] || 200;
    const height = NODE_HEIGHTS[node.type || 'action'] || 60;

    return {
      ...node,
      targetPosition: isHorizontal ? Position.Left : Position.Top,
      sourcePosition: isHorizontal ? Position.Right : Position.Bottom,
      position: {
        x: pos.x - width / 2,
        y: pos.y - height / 2,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
}

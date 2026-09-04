/**
 * packages/renderer-dom/src/impact.ts
 * Upstream/Downstream Blast Radius & Route Pathfinder for Markdy.
 * Clean-room re-engineered interactive topology analysis.
 * Zero external dependencies.
 */

import type { DiagramAST } from "@markdy/core";

export interface BlastRadiusResult {
  rootNodeId: string;
  upstreamNodeIds: Set<string>;
  downstreamNodeIds: Set<string>;
  allImpactedNodeIds: Set<string>;
  connectedEdgeKeys: Set<string>;
}

export interface DiagramEdgeItem {
  from: string;
  to: string;
  op?: string;
  label?: string;
}

/**
 * Extracts all structural and storyboard flow connections from a DiagramAST.
 */
export function extractAllDiagramEdges(ast: DiagramAST): DiagramEdgeItem[] {
  const result: DiagramEdgeItem[] = [];
  const seen = new Set<string>();

  const add = (from: string, to: string, op?: string, label?: string) => {
    const key = `${from}->${to}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push({ from, to, op, label });
    }
  };

  for (const edge of ast.edges || []) {
    add(edge.from, edge.to, edge.kind, edge.label);
  }

  for (const beat of ast.beats || []) {
    for (const cue of beat.cues || []) {
      if (cue.kind === "flow") {
        for (const segment of cue.segments) {
          add(segment.from, segment.to, segment.op, segment.label);
        }
      } else if (cue.kind === "parallel") {
        for (const childCue of cue.cues) {
          if (childCue.kind === "flow") {
            for (const segment of childCue.segments) {
              add(segment.from, segment.to, segment.op, segment.label);
            }
          }
        }
      }
    }
  }

  return result;
}

/**
 * Traverses diagram topology to compute upstream (who depends on this)
 * and downstream (who does this depend on) blast radius.
 */
export function calculateBlastRadius(
  nodeId: string,
  ast: DiagramAST,
  maxDepth = 10
): BlastRadiusResult {
  const upstreamNodeIds = new Set<string>();
  const downstreamNodeIds = new Set<string>();
  const connectedEdgeKeys = new Set<string>();

  const edges = extractAllDiagramEdges(ast);

  // 1. Downstream (Outward / Forward BFS)
  const forwardQueue: Array<{ id: string; depth: number }> = [{ id: nodeId, depth: 0 }];
  const visitedForward = new Set<string>([nodeId]);

  while (forwardQueue.length > 0) {
    const { id, depth } = forwardQueue.shift()!;
    if (depth >= maxDepth) continue;

    for (const edge of edges) {
      if (edge.from === id) {
        connectedEdgeKeys.add(`${edge.from}->${edge.to}`);
        if (!visitedForward.has(edge.to)) {
          visitedForward.add(edge.to);
          downstreamNodeIds.add(edge.to);
          forwardQueue.push({ id: edge.to, depth: depth + 1 });
        }
      }
    }
  }

  // 2. Upstream (Inward / Reverse BFS)
  const backwardQueue: Array<{ id: string; depth: number }> = [{ id: nodeId, depth: 0 }];
  const visitedBackward = new Set<string>([nodeId]);

  while (backwardQueue.length > 0) {
    const { id, depth } = backwardQueue.shift()!;
    if (depth >= maxDepth) continue;

    for (const edge of edges) {
      if (edge.to === id) {
        connectedEdgeKeys.add(`${edge.from}->${edge.to}`);
        if (!visitedBackward.has(edge.from)) {
          visitedBackward.add(edge.from);
          upstreamNodeIds.add(edge.from);
          backwardQueue.push({ id: edge.from, depth: depth + 1 });
        }
      }
    }
  }

  const allImpactedNodeIds = new Set<string>([nodeId, ...upstreamNodeIds, ...downstreamNodeIds]);

  return {
    rootNodeId: nodeId,
    upstreamNodeIds,
    downstreamNodeIds,
    allImpactedNodeIds,
    connectedEdgeKeys,
  };
}

/**
 * Finds the shortest topological path between two nodes in the diagram.
 */
export function findShortestRoute(
  fromId: string,
  toId: string,
  ast: DiagramAST
): string[] | null {
  if (fromId === toId) return [fromId];

  const edges = extractAllDiagramEdges(ast);
  const queue: Array<{ current: string; path: string[] }> = [{ current: fromId, path: [fromId] }];
  const visited = new Set<string>([fromId]);

  while (queue.length > 0) {
    const { current, path } = queue.shift()!;

    for (const edge of edges) {
      if (edge.from === current) {
        if (edge.to === toId) {
          return [...path, toId];
        }
        if (!visited.has(edge.to)) {
          visited.add(edge.to);
          queue.push({ current: edge.to, path: [...path, edge.to] });
        }
      }
    }
  }

  return null;
}

/**
 * Highlights impacted nodes and edges within a rendered diagram container.
 */
export function applyImpactHighlight(container: HTMLElement, impact: BlastRadiusResult): void {
  const nodeElements = container.querySelectorAll<HTMLElement>("[data-node-id]");
  nodeElements.forEach((el) => {
    const id = el.getAttribute("data-node-id");
    if (!id) return;

    if (id === impact.rootNodeId) {
      el.style.opacity = "1";
      el.style.filter = "drop-shadow(0 0 12px rgba(56, 189, 248, 0.8))";
    } else if (impact.upstreamNodeIds.has(id)) {
      el.style.opacity = "1";
      el.style.filter = "drop-shadow(0 0 8px rgba(167, 139, 250, 0.6))";
    } else if (impact.downstreamNodeIds.has(id)) {
      el.style.opacity = "1";
      el.style.filter = "drop-shadow(0 0 8px rgba(52, 211, 153, 0.6))";
    } else {
      el.style.opacity = "0.2";
      el.style.filter = "grayscale(80%)";
    }
  });

  const edgeElements = container.querySelectorAll<SVGElement>("[data-edge-key]");
  edgeElements.forEach((el) => {
    const key = el.getAttribute("data-edge-key");
    if (!key) return;
    if (impact.connectedEdgeKeys.has(key)) {
      el.style.opacity = "1";
      el.style.stroke = "#38bdf8";
    } else {
      el.style.opacity = "0.15";
    }
  });
}

/**
 * Clears any active impact highlighting on the diagram.
 */
export function clearImpactHighlight(container: HTMLElement): void {
  const nodeElements = container.querySelectorAll<HTMLElement>("[data-node-id]");
  nodeElements.forEach((el) => {
    el.style.opacity = "";
    el.style.filter = "";
  });

  const edgeElements = container.querySelectorAll<SVGElement>("[data-edge-key]");
  edgeElements.forEach((el) => {
    el.style.opacity = "";
    el.style.stroke = "";
  });
}

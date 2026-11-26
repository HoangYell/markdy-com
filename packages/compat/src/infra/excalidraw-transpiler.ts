/**
 * packages/compat/src/infra/excalidraw-transpiler.ts
 * Transpiles Excalidraw JSON scene files (.excalidraw) into animated MarkdyScript.
 * Zero external dependencies.
 */

import { classifyTechnology } from "@markdy/core";

export interface ExcalidrawElement {
  id: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  text?: string;
  name?: string | null;
  containerId?: string | null;
  boundElements?: Array<{ id: string; type: string }> | null;
  startBinding?: { elementId: string } | null;
  endBinding?: { elementId: string } | null;
  strokeStyle?: string;
  frameId?: string | null;
  isDeleted?: boolean;
}

export interface ExcalidrawTranspileResult {
  code: string;
  markdyScript: string;
  diagramType: "architecture";
  nodeCount: number;
  edgeCount: number;
  groupCount: number;
  warnings: string[];
}

function cleanText(raw: string): string {
  return raw.replace(/\r?\n/g, " ").replace(/"/g, "'").replace(/\s+/g, " ").trim();
}

function makeSlugId(label: string, index: number, used: Set<string>): string {
  let base = label
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 28);
  if (!base || /^[0-9]/.test(base)) base = `node_${base || index + 1}`;
  let candidate = base;
  let n = 2;
  while (used.has(candidate)) {
    candidate = `${base}_${n++}`;
  }
  used.add(candidate);
  return candidate;
}

function inferKindFromShape(type: string, label: string): string {
  const lower = label.toLowerCase();
  if (type === "diamond" && /(decision|check|branch|valid|if)/.test(lower)) {
    return "decision";
  }
  const classified = classifyTechnology(lower);
  if (classified.kind && classified.kind !== "service") {
    return classified.kind;
  }
  if (type === "diamond") return "gateway";
  if (type === "ellipse") {
    if (/(db|database|store|sql|postgres|mongo)/.test(lower)) return "database";
    return "browser";
  }
  return "service";
}

function containsBox(outer: ExcalidrawElement, inner: ExcalidrawElement): boolean {
  const cx = inner.x + inner.width / 2;
  const cy = inner.y + inner.height / 2;
  return (
    cx >= outer.x &&
    cx <= outer.x + outer.width &&
    cy >= outer.y &&
    cy <= outer.y + outer.height
  );
}

export function transpileExcalidrawToMarkdy(
  jsonSource: string,
  sceneTitle = "Excalidraw Architecture"
): ExcalidrawTranspileResult {
  let parsed: { type?: string; elements?: ExcalidrawElement[] };
  try {
    parsed = JSON.parse(jsonSource);
  } catch {
    throw new Error("Invalid Excalidraw JSON payload");
  }

  const elements = Array.isArray(parsed?.elements)
    ? parsed.elements.filter((el) => el && !el.isDeleted)
    : [];

  if (elements.length === 0) {
    throw new Error("Excalidraw JSON contains no active elements");
  }

  const warnings: string[] = [];
  const textByContainer = new Map<string, string[]>();
  for (const el of elements) {
    if (el.type === "text" && el.containerId && el.text) {
      const list = textByContainer.get(el.containerId) || [];
      list.push(cleanText(el.text));
      textByContainer.set(el.containerId, list);
    }
  }

  const shapeEls = elements.filter((el) =>
    ["rectangle", "ellipse", "diamond"].includes(el.type)
  );
  const frameEls = elements.filter((el) => el.type === "frame");
  const arrowEls = elements.filter((el) => el.type === "arrow" || el.type === "line");

  // Detect large container rectangles (enclosing >= 2 smaller shapes) when no explicit frames exist
  const containerIds = new Set<string>();
  const containers: Array<{ id: string; label: string; el: ExcalidrawElement; isFrame: boolean }> = [];
  const usedIds = new Set<string>();

  for (let i = 0; i < frameEls.length; i++) {
    const f = frameEls[i];
    const lbl = cleanText(f.name || `Group ${i + 1}`);
    containers.push({ id: makeSlugId(lbl, i, usedIds), label: lbl, el: f, isFrame: true });
    containerIds.add(f.id);
  }

  for (const rect of shapeEls) {
    if (rect.type !== "rectangle") continue;
    const enclosed = shapeEls.filter((other) => other.id !== rect.id && containsBox(rect, other));
    if (enclosed.length >= 2) {
      const lbl = (textByContainer.get(rect.id) || []).join(" ") || `Group ${containers.length + 1}`;
      containers.push({ id: makeSlugId(lbl, containers.length, usedIds), label: lbl, el: rect, isFrame: false });
      containerIds.add(rect.id);
    }
  }

  // Build vertex nodes
  const exIdToMarkdyId = new Map<string, string>();
  const nodes: Array<{ id: string; label: string; kind: string; el: ExcalidrawElement }> = [];

  for (let i = 0; i < shapeEls.length; i++) {
    const el = shapeEls[i];
    if (containerIds.has(el.id)) continue;

    const boundText = (textByContainer.get(el.id) || []).join(" ").trim();
    const label = boundText || `Node ${nodes.length + 1}`;
    const id = makeSlugId(boundText || `node_${i + 1}`, i, usedIds);
    const kind = inferKindFromShape(el.type, label);

    exIdToMarkdyId.set(el.id, id);
    nodes.push({ id, label, kind, el });
  }

  // Fallback: if Excalidraw file only has standalone text nodes with arrows
  if (nodes.length === 0) {
    const freeTexts = elements.filter((el) => el.type === "text" && !el.containerId && el.text);
    for (let i = 0; i < freeTexts.length; i++) {
      const el = freeTexts[i];
      const label = cleanText(el.text || `Text ${i + 1}`);
      const id = makeSlugId(label, i, usedIds);
      exIdToMarkdyId.set(el.id, id);
      nodes.push({ id, label, kind: inferKindFromShape("rectangle", label), el });
    }
  }

  // Group membership
  const groups: Array<{ id: string; label: string; members: string[] }> = [];
  for (const c of containers) {
    const members = nodes
      .filter((n) => (c.isFrame && n.el.frameId === c.el.id) || containsBox(c.el, n.el))
      .map((n) => n.id);
    if (members.length > 0) {
      groups.push({ id: c.id, label: c.label, members });
    }
  }

  // Edges
  const edges: Array<{ from: string; to: string; op: string; label?: string }> = [];
  for (const arrow of arrowEls) {
    const fromExId = arrow.startBinding?.elementId;
    const toExId = arrow.endBinding?.elementId;
    if (!fromExId || !toExId) {
      warnings.push(`Skipped unbound arrow ${arrow.id}`);
      continue;
    }
    const from = exIdToMarkdyId.get(fromExId);
    const to = exIdToMarkdyId.get(toExId);
    if (!from || !to) continue;

    const op = arrow.strokeStyle === "dashed" || arrow.strokeStyle === "dotted" ? "~>" : "->";
    const arrowLabel = (textByContainer.get(arrow.id) || []).join(" ").trim() || undefined;
    edges.push({ from, to, op, label: arrowLabel });
  }

  // Infer LR vs TB from node coordinate spread
  let direction: "LR" | "TB" = "LR";
  if (nodes.length >= 2) {
    const xs = nodes.map((n) => n.el.x);
    const ys = nodes.map((n) => n.el.y);
    const spanX = Math.max(...xs) - Math.min(...xs);
    const spanY = Math.max(...ys) - Math.min(...ys);
    if (spanY > spanX * 1.25) direction = "TB";
  }

  const out: string[] = [];
  out.push(`scene "${cleanText(sceneTitle)}" theme=paper`);
  out.push(`layout ${direction}`);
  out.push("");

  for (const g of groups) {
    out.push(`group ${g.id} "${g.label}": ${g.members.join(" ")}`);
  }
  if (groups.length > 0) out.push("");

  for (const n of nodes) {
    out.push(`${n.kind} ${n.id} "${n.label}"`);
  }

  out.push("");
  out.push('beat main "Excalidraw Whiteboard Flow":');
  out.push("  show $nodes stagger=50ms");
  for (const e of edges) {
    out.push(e.label ? `  ${e.from} ${e.op} ${e.to} "${e.label}"` : `  ${e.from} ${e.op} ${e.to}`);
  }

  const code = out.join("\n") + "\n";
  return {
    code,
    markdyScript: code,
    diagramType: "architecture",
    nodeCount: nodes.length,
    edgeCount: edges.length,
    groupCount: groups.length,
    warnings,
  };
}

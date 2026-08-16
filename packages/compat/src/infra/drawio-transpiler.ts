/**
 * packages/compat/src/infra/drawio-transpiler.ts
 * Transpiles Draw.io / diagrams.net XML and compressed model files into animated MarkdyScript scenes.
 * Zero external dependencies.
 */

import { classifyTechnology } from "@markdy/core";

export interface DrawioCell {
  id: string;
  value: string;
  style: string;
  isVertex: boolean;
  isEdge: boolean;
  source?: string;
  target?: string;
  parent?: string;
}

export interface DrawioModel {
  title: string;
  cells: DrawioCell[];
}

function sanitizeId(raw: string, fallback: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_]/g, "");
  if (/^[0-9]/.test(cleaned) || cleaned.length === 0) {
    return `${fallback}_${cleaned}`;
  }
  return cleaned;
}

function stripHtml(raw: string): string {
  return raw
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/?[^>]+(>|$)/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .trim();
}

function inferKindFromStyleAndLabel(style: string, label: string): string {
  const styleLower = style.toLowerCase();
  const labelLower = label.toLowerCase();

  if (styleLower.includes("shape=cylinder") || styleLower.includes("datastore") || styleLower.includes("database")) {
    return "database";
  }
  if (styleLower.includes("shape=cloud") || styleLower.includes("network")) {
    return "cloud";
  }
  if (styleLower.includes("shape=actor") || styleLower.includes("person") || styleLower.includes("user")) {
    return "user";
  }
  if (styleLower.includes("shape=hexagon") || styleLower.includes("gateway")) {
    return "gateway";
  }
  if (styleLower.includes("queue") || styleLower.includes("message") || styleLower.includes("kafka") || styleLower.includes("sqs")) {
    return "queue";
  }
  if (styleLower.includes("cache") || styleLower.includes("redis")) {
    return "cache";
  }
  if (styleLower.includes("storage") || styleLower.includes("bucket") || styleLower.includes("s3")) {
    return "storage";
  }

  // Fall back to technology classifier on label
  const profile = classifyTechnology(labelLower);
  if (profile.kind && profile.kind !== "service") {
    return profile.kind;
  }

  return "service";
}

/**
 * Parses XML string extracting mxCell elements.
 */
export function parseDrawioXml(xml: string, defaultTitle: string = "Imported Draw.io"): DrawioModel {
  const cells: DrawioCell[] = [];

  // Match diagram title if present
  const diagramTitleMatch = xml.match(/<diagram[^>]*name="([^"]+)"/i);
  const title = diagramTitleMatch ? diagramTitleMatch[1] : defaultTitle;

  // Match all <mxCell ... /> or <mxCell ...>...</mxCell> tags
  const cellRegex = /<mxCell\s+([^>]+)(?:\/>|>([\s\S]*?)<\/mxCell>)/gi;
  let match: RegExpExecArray | null;

  while ((match = cellRegex.exec(xml)) !== null) {
    const attrStr = match[1];
    const innerContent = match[2] || "";

    const idMatch = attrStr.match(/id="([^"]+)"/i);
    if (!idMatch) continue;
    const id = idMatch[1];

    if (id === "0" || id === "1") continue; // Root container cells

    const valueAttrMatch = attrStr.match(/value="([^"]*)"/i);
    let rawValue = valueAttrMatch ? valueAttrMatch[1] : "";
    if (!rawValue && innerContent) {
      rawValue = innerContent;
    }
    const cleanValue = stripHtml(rawValue);

    const styleMatch = attrStr.match(/style="([^"]*)"/i);
    const style = styleMatch ? styleMatch[1] : "";

    const isVertex = /vertex="1"/i.test(attrStr);
    const isEdge = /edge="1"/i.test(attrStr);

    const sourceMatch = attrStr.match(/source="([^"]+)"/i);
    const targetMatch = attrStr.match(/target="([^"]+)"/i);
    const parentMatch = attrStr.match(/parent="([^"]+)"/i);

    cells.push({
      id,
      value: cleanValue,
      style,
      isVertex,
      isEdge,
      source: sourceMatch ? sourceMatch[1] : undefined,
      target: targetMatch ? targetMatch[1] : undefined,
      parent: parentMatch ? parentMatch[1] : undefined,
    });
  }

  return { title, cells };
}

/**
 * Transpiles Draw.io XML or model into MarkdyScript.
 */
export async function transpileDrawioToMarkdy(
  source: string,
  customTitle?: string
): Promise<{ code: string; nodeCount: number; edgeCount: number }> {
  let xml = source.trim();

  // If source contains <diagram> with compressed base64 content, attempt XML extraction or direct text
  if (xml.includes("<diagram") && !xml.includes("<mxGraphModel>")) {
    const diagramMatch = xml.match(/<diagram[^>]*>([\s\S]*?)<\/diagram>/i);
    if (diagramMatch) {
      const payload = diagramMatch[1].trim();
      try {
        const binaryStr = atob(payload);
        // If it looks like raw XML
        if (binaryStr.includes("<mxGraphModel")) {
          xml = binaryStr;
        } else if (typeof DecompressionStream !== "undefined") {
          // Attempt Deflate decompression
          const uint8 = new Uint8Array(binaryStr.length);
          for (let i = 0; i < binaryStr.length; i++) {
            uint8[i] = binaryStr.charCodeAt(i);
          }
          try {
            const ds = new DecompressionStream("deflate-raw");
            const writer = ds.writable.getWriter();
            writer.write(uint8);
            writer.close();

            const reader = ds.readable.getReader();
            const chunks: Uint8Array[] = [];
            let totalLen = 0;
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              if (value) {
                chunks.push(value);
                totalLen += value.length;
              }
            }

            const decompressed = new Uint8Array(totalLen);
            let offset = 0;
            for (const c of chunks) {
              decompressed.set(c, offset);
              offset += c.length;
            }

            const decodedStr = new TextDecoder().decode(decompressed);
            xml = decodeURIComponent(decodedStr);
          } catch (e) {
            // keep raw xml on fail
          }
        }
      } catch {
        // Keep raw xml
      }
    }
  }

  const model = parseDrawioXml(xml, customTitle);
  const vertexCells = model.cells.filter((c) => c.isVertex);
  const edgeCells = model.cells.filter((c) => c.isEdge);

  const cellIdToNodeId = new Map<string, string>();
  const nodes: { id: string; kind: string; label: string }[] = [];

  for (const cell of vertexCells) {
    const rawLabel = cell.value || `Component_${cell.id}`;
    const rawIdentifier = isNaN(Number(cell.id)) && cell.id.length > 0 ? cell.id : (cell.value || `node_${cell.id}`);
    const nodeId = sanitizeId(rawIdentifier, `node_${cell.id}`);
    const kind = inferKindFromStyleAndLabel(cell.style, rawLabel);

    cellIdToNodeId.set(cell.id, nodeId);
    nodes.push({ id: nodeId, kind, label: rawLabel });
  }

  const lines: string[] = [];
  lines.push(`scene "${customTitle || model.title || "Imported Draw.io Architecture"}" theme=paper`);
  lines.push(`layout LR`);
  lines.push(``);

  if (nodes.length > 0) {
    for (const node of nodes) {
      lines.push(`${node.kind} ${node.id} "${node.label}"`);
    }
    lines.push(``);
  }

  const flows: { from: string; to: string; label?: string }[] = [];
  for (const edge of edgeCells) {
    if (edge.source && edge.target) {
      const sourceId = cellIdToNodeId.get(edge.source);
      const targetId = cellIdToNodeId.get(edge.target);
      if (sourceId && targetId) {
        flows.push({
          from: sourceId,
          to: targetId,
          label: edge.value || undefined,
        });
      }
    }
  }

  lines.push(`beat main "System Flow":`);
  lines.push(`  show $nodes stagger=60ms`);

  if (flows.length > 0) {
    for (const flow of flows) {
      if (flow.label) {
        lines.push(`  ${flow.from} -> ${flow.to} "${flow.label}"`);
      } else {
        lines.push(`  ${flow.from} -> ${flow.to}`);
      }
    }
  }

  return {
    code: lines.join("\n"),
    nodeCount: nodes.length,
    edgeCount: flows.length,
  };
}

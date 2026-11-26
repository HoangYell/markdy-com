/**
 * packages/compat/src/universal.ts
 * Format auto-detection and unified converter pipeline into MarkdyScript.
 */

import { transpileMermaidToMarkdy } from "./mermaid/mermaid-transpiler.js";
import { transpileD2ToMarkdy } from "./infra/d2-transpiler.js";
import { transpilePlantUmlToMarkdy } from "./infra/plantuml-transpiler.js";
import { transpileDotToMarkdy } from "./infra/dot-transpiler.js";
import { transpileDrawioToMarkdy } from "./infra/drawio-transpiler.js";
import { transpileExcalidrawToMarkdy } from "./infra/excalidraw-transpiler.js";
import { transpileDockerComposeToMarkdy } from "./infra/docker-compose-transpiler.js";
import { transpileKubernetesManifestsToMarkdy } from "./infra/k8s-transpiler.js";
import { transpileTerraformStateToMarkdy } from "./infra/terraform-transpiler.js";

export type CompatFormat =
  | "mermaid"
  | "d2"
  | "plantuml"
  | "dot"
  | "drawio"
  | "excalidraw"
  | "compose"
  | "k8s"
  | "terraform";

export interface TranspileToMarkdyOptions {
  format?: CompatFormat | "auto";
  title?: string;
  theme?: string;
  layout?: "auto" | "LR" | "TB" | "RL" | "BT";
  includePlayer?: boolean;
  filenameHint?: string;
}

export interface UnifiedTranspileResult {
  code: string;
  format: CompatFormat;
  detectedFormat: CompatFormat;
  diagramType: string;
  nodeCount: number;
  edgeCount: number;
  groupCount: number;
  warnings: string[];
}

const DEFAULT_PLAYER_BLOCK = `player:
  playback:
    loop false
  controls:
    speed true
    fullscreen true
    gif true
    theme true
  interaction:
    zoom true
    pan true
    click_to_play true
    double_click_to_reset true
    keyboard false
  chrome:
    badge true
    progress none`;

export function detectDiagramFormat(source: string, filenameHint?: string): CompatFormat {
  const hint = (filenameHint || "").toLowerCase();
  if (hint.endsWith(".mmd") || hint.endsWith(".mermaid")) return "mermaid";
  if (hint.endsWith(".d2")) return "d2";
  if (hint.endsWith(".puml") || hint.endsWith(".plantuml") || hint.endsWith(".iuml")) return "plantuml";
  if (hint.endsWith(".dot") || hint.endsWith(".gv")) return "dot";
  if (hint.endsWith(".drawio")) return "drawio";
  if (hint.endsWith(".excalidraw")) return "excalidraw";
  if (hint.endsWith(".tfstate")) return "terraform";
  if (hint.includes("compose") && (hint.endsWith(".yml") || hint.endsWith(".yaml"))) return "compose";

  const trimmed = source.trim();
  if (!trimmed) return "mermaid";

  // JSON-based formats
  if (trimmed.startsWith("{")) {
    try {
      const json = JSON.parse(trimmed) as Record<string, unknown>;
      if (json.type === "excalidraw" && Array.isArray(json.elements)) {
        return "excalidraw";
      }
      if (Array.isArray(json.resources) || "terraform_version" in json) {
        return "terraform";
      }
    } catch {
      // fall through to text heuristics
    }
  }

  // XML Draw.io
  if (/<mxGraphModel\b|<mxfile\b|<mxCell\b/i.test(trimmed)) {
    return "drawio";
  }

  // PlantUML / C4-PlantUML
  if (/@startuml|@enduml|\b(?:Person|Person_Ext|Container|ContainerDb|ContainerQueue|System_Ext|Rel)\s*\(/i.test(trimmed)) {
    return "plantuml";
  }

  // Graphviz DOT
  if (/^\s*(?:strict\s+)?(?:di)?graph\b[\s\S]*\{/im.test(trimmed) || /\brankdir\s*=\s*"?(?:LR|TB|TD|RL|BT)"?/im.test(trimmed)) {
    return "dot";
  }

  // Kubernetes YAML
  if (/^apiVersion\s*:/m.test(trimmed) && /^kind\s*:/m.test(trimmed)) {
    return "k8s";
  }

  // Docker Compose YAML
  if (/^services\s*:/m.test(trimmed) && /\b(?:image|build|ports|depends_on)\s*:/m.test(trimmed)) {
    return "compose";
  }

  // Mermaid
  if (/^\s*(?:flowchart|graph\s+(?:LR|RL|TB|TD|BT)|sequenceDiagram|stateDiagram(?:-v2)?|subgraph\s+)/im.test(trimmed)) {
    return "mermaid";
  }

  // D2 heuristics (colons for node labels or containers, <-> or ..> or .shape:)
  if (/^[a-zA-Z0-9_.-]+\s*:\s*\{/m.test(trimmed) || /\.(?:shape|icon|style\.fill)\s*:/m.test(trimmed) || (/^[a-zA-Z0-9_.-]+\s*:\s*[^:\n]+$/m.test(trimmed) && !trimmed.includes("-->"))) {
    return "d2";
  }

  return "mermaid";
}

function applyOverrides(
  code: string,
  options: Pick<TranspileToMarkdyOptions, "theme" | "layout" | "includePlayer">
): string {
  let out = code.trim();

  if (options.theme && options.theme !== "keep") {
    const themeVal = options.theme.trim();
    if (/\btheme=[a-zA-Z0-9_-]+/.test(out)) {
      out = out.replace(/\btheme=[a-zA-Z0-9_-]+/, `theme=${themeVal}`);
    } else if (/^scene\b/m.test(out)) {
      out = out.replace(/^scene\b(.*)$/m, `scene theme=${themeVal}$1`);
    }
  }

  if (options.layout && options.layout !== "auto") {
    if (/^layout\s+(?:LR|TB|RL|BT)\b/m.test(out)) {
      out = out.replace(/^layout\s+(?:LR|TB|RL|BT)\b/m, `layout ${options.layout}`);
    } else if (!/\btype=sequence\b/.test(out)) {
      out = out.replace(/^(scene[^\n]*)$/m, `$1\nlayout ${options.layout}`);
    }
  }

  if (options.includePlayer && !/^player\s*:/m.test(out)) {
    out = `${out}\n\n${DEFAULT_PLAYER_BLOCK}`;
  }

  return out + "\n";
}

function countMetrics(markdyCode: string): { nodes: number; edges: number; groups: number } {
  const lines = markdyCode.split(/\r?\n/).map((l) => l.trim());
  let nodes = 0;
  let edges = 0;
  let groups = 0;
  let inBeat = false;
  let inPlayer = false;

  for (const line of lines) {
    if (!line || line.startsWith("//") || line.startsWith("#")) continue;
    if (line.startsWith("player:")) {
      inPlayer = true;
      inBeat = false;
      continue;
    }
    if (line.startsWith("beat ")) {
      inBeat = true;
      inPlayer = false;
      continue;
    }
    if (line.startsWith("scene ") || line.startsWith("layout ")) {
      inPlayer = false;
      inBeat = false;
      continue;
    }
    if (line.startsWith("group ")) {
      groups++;
      continue;
    }
    if (inPlayer) continue;
    if (inBeat) {
      if (/(->|<-|~>|<->|\.\.>|--)/.test(line)) edges++;
      continue;
    }
    if (/^[a-zA-Z_][a-zA-Z0-9_]*\s+[a-zA-Z0-9_.-]+/.test(line)) {
      nodes++;
    }
  }

  return { nodes, edges, groups };
}

export async function transpileToMarkdy(
  source: string,
  options: TranspileToMarkdyOptions = {}
): Promise<UnifiedTranspileResult> {
  const detectedFormat = detectDiagramFormat(source, options.filenameHint);
  const format: CompatFormat =
    !options.format || options.format === "auto" ? detectedFormat : options.format;

  const title = options.title?.trim();
  let rawCode = "";
  let diagramType = "architecture";
  let nodeCount = 0;
  let edgeCount = 0;
  let groupCount = 0;
  let warnings: string[] = [];

  switch (format) {
    case "mermaid": {
      const res = transpileMermaidToMarkdy(source, title || "");
      rawCode = res.code;
      diagramType = res.diagramType;
      nodeCount = res.nodeCount;
      edgeCount = res.edgeCount;
      groupCount = res.groupCount ?? 0;
      warnings = res.warnings ?? [];
      break;
    }
    case "d2": {
      const res = transpileD2ToMarkdy(source);
      rawCode = res.markdyScript;
      if (title) {
        rawCode = rawCode.replace(/^scene\s+"[^"]+"/m, `scene "${title.replace(/"/g, "'")}"`);
      }
      nodeCount = res.nodeCount;
      edgeCount = res.edgeCount;
      groupCount = res.containerCount;
      warnings = res.warnings;
      break;
    }
    case "plantuml": {
      const res = transpilePlantUmlToMarkdy(source);
      rawCode = res.markdyScript;
      if (title) {
        rawCode = rawCode.replace(/^scene\s+"[^"]+"/m, `scene "${title.replace(/"/g, "'")}"`);
      }
      nodeCount = res.nodeCount;
      edgeCount = res.edgeCount;
      groupCount = res.groupCount;
      warnings = res.warnings;
      break;
    }
    case "dot": {
      const res = transpileDotToMarkdy(source, title || "Graphviz Architecture");
      rawCode = res.code;
      nodeCount = res.nodeCount;
      edgeCount = res.edgeCount;
      groupCount = res.groupCount;
      warnings = res.warnings;
      break;
    }
    case "drawio": {
      const res = await transpileDrawioToMarkdy(source, title || "Imported Draw.io");
      rawCode = res.code;
      nodeCount = res.nodeCount;
      edgeCount = res.edgeCount;
      break;
    }
    case "excalidraw": {
      const res = transpileExcalidrawToMarkdy(source, title || "Excalidraw Architecture");
      rawCode = res.code;
      nodeCount = res.nodeCount;
      edgeCount = res.edgeCount;
      groupCount = res.groupCount;
      warnings = res.warnings;
      break;
    }
    case "compose": {
      rawCode = transpileDockerComposeToMarkdy(source, title || "Container Topology");
      const m = countMetrics(rawCode);
      nodeCount = m.nodes;
      edgeCount = m.edges;
      groupCount = m.groups;
      break;
    }
    case "k8s": {
      rawCode = transpileKubernetesManifestsToMarkdy(source, title || "Kubernetes Cluster Topology");
      const m = countMetrics(rawCode);
      nodeCount = m.nodes;
      edgeCount = m.edges;
      groupCount = m.groups;
      break;
    }
    case "terraform": {
      rawCode = transpileTerraformStateToMarkdy(source, title || "Cloud Infrastructure Architecture");
      const m = countMetrics(rawCode);
      nodeCount = m.nodes;
      edgeCount = m.edges;
      groupCount = m.groups;
      break;
    }
  }

  const finalCode = applyOverrides(rawCode, options);

  return {
    code: finalCode,
    format,
    detectedFormat,
    diagramType,
    nodeCount,
    edgeCount,
    groupCount,
    warnings,
  };
}

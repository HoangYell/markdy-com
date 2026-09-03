/**
 * packages/core/src/arch-lint.ts
 * Architecture topology and governance validation for MarkdyScript ASTs.
 * Zero runtime dependencies.
 */

import type { DiagramAST, NodeDecl, EdgeKind } from "./ast.js";
import { nodeRole } from "./registry.js";

export type RuleSeverity = "error" | "warning" | "info";

export type ArchRuleType =
  | "cannot-connect"
  | "must-connect"
  | "forbidden-cycle"
  | "must-have-role"
  | "role-count-limit";

export interface NodeSelector {
  id?: string;
  kindEquals?: string;
  roleEquals?: string;
  labelContains?: string;
}

export interface EdgeSelector {
  kind?: EdgeKind;
  labelContains?: string;
}

export interface ArchitectureRule {
  id: string;
  name: string;
  description: string;
  severity: RuleSeverity;
  type: ArchRuleType;
  from?: NodeSelector;
  to?: NodeSelector;
  edge?: EdgeSelector;
  min?: number;
  max?: number;
}

export interface ArchitectureViolation {
  ruleId: string;
  ruleName: string;
  message: string;
  severity: RuleSeverity;
  nodeIds: string[];
  edgeKeys: string[];
  line?: number;
}

export interface ArchitecturePreset {
  id: string;
  name: string;
  description: string;
  rules: ArchitectureRule[];
}

function matchNode(node: NodeDecl, selector?: NodeSelector): boolean {
  if (!selector) return true;
  if (selector.id && node.id !== selector.id) return false;
  if (selector.kindEquals && node.kind.toLowerCase() !== selector.kindEquals.toLowerCase()) return false;
  if (selector.roleEquals) {
    const role = nodeRole(node.kind);
    const targetRole = selector.roleEquals.toLowerCase();
    if (targetRole === "gateway") {
      const isGateway = role === "network" || ["gateway", "api_gateway", "reverse_proxy", "proxy", "router"].includes(node.kind.toLowerCase());
      if (!isGateway) return false;
    } else if (role.toLowerCase() !== targetRole) {
      return false;
    }
  }
  if (selector.labelContains) {
    const target = (node.label || node.id).toLowerCase();
    if (!target.includes(selector.labelContains.toLowerCase())) return false;
  }
  return true;
}

function matchEdge(
  edge: { kind: EdgeKind; label?: string },
  selector?: EdgeSelector
): boolean {
  if (!selector) return true;
  if (selector.kind && edge.kind !== selector.kind) return false;
  if (selector.labelContains) {
    const label = (edge.label || "").toLowerCase();
    if (!label.includes(selector.labelContains.toLowerCase())) return false;
  }
  return true;
}

interface GraphEdge {
  from: string;
  to: string;
  kind: EdgeKind;
  label?: string;
  line: number;
}

function extractAllEdges(ast: DiagramAST): GraphEdge[] {
  const edges: GraphEdge[] = [];
  const seen = new Set<string>();

  // 1. Static declared edges
  for (const edge of ast.edges) {
    const key = `${edge.from}->${edge.to}:${edge.kind}:${edge.label ?? ""}`;
    if (!seen.has(key)) {
      seen.add(key);
      edges.push({
        from: edge.from,
        to: edge.to,
        kind: edge.kind,
        label: edge.label,
        line: edge.line,
      });
    }
  }

  // 2. Flow segments inside beats
  for (const beat of ast.beats) {
    for (const cue of beat.cues) {
      if (cue.kind === "flow") {
        for (const seg of cue.segments) {
          const key = `${seg.from}->${seg.to}:${seg.op}:${seg.label ?? ""}`;
          if (!seen.has(key)) {
            seen.add(key);
            edges.push({
              from: seg.from,
              to: seg.to,
              kind: seg.op,
              label: seg.label,
              line: cue.line,
            });
          }
        }
      }
    }
  }

  return edges;
}

interface CycleResult {
  path: string[];
  line?: number;
}

function detectCycleInGraph(
  nodes: NodeDecl[],
  edges: GraphEdge[],
  edgeFilter?: EdgeSelector
): CycleResult | null {
  const candidateEdges = edges.filter((e) => matchEdge(e, edgeFilter));
  const adj = new Map<string, Array<{ to: string; line: number }>>();

  for (const e of candidateEdges) {
    if (!adj.has(e.from)) adj.set(e.from, []);
    adj.get(e.from)!.push({ to: e.to, line: e.line });
  }

  const visited = new Set<string>();
  const onStack = new Set<string>();
  const parentMap = new Map<string, string>();
  let foundCycle: CycleResult | null = null;

  const dfs = (curr: string) => {
    visited.add(curr);
    onStack.add(curr);

    for (const next of adj.get(curr) ?? []) {
      if (foundCycle) return;
      if (!visited.has(next.to)) {
        parentMap.set(next.to, curr);
        dfs(next.to);
      } else if (onStack.has(next.to)) {
        const cycle: string[] = [next.to, curr];
        let p = curr;
        while (p !== next.to && parentMap.has(p)) {
          p = parentMap.get(p)!;
          cycle.push(p);
        }
        foundCycle = {
          path: cycle.reverse(),
          line: next.line,
        };
        return;
      }
    }
    onStack.delete(curr);
  };

  for (const node of nodes) {
    if (!visited.has(node.id)) {
      dfs(node.id);
      if (foundCycle) return foundCycle;
    }
  }

  return null;
}

export const ARCH_RULE_PRESETS: Record<string, ArchitecturePreset> = {
  cleanArchitecture: {
    id: "clean-architecture",
    name: "Clean / Layered Architecture",
    description: "Enforce strict dependency rules: Presentation cannot directly access Data Storage",
    rules: [
      {
        id: "no-presentation-to-database",
        name: "No Direct Client DB Access",
        description: "Presentation/Client components must communicate via backend services, never directly with databases.",
        severity: "error",
        type: "cannot-connect",
        from: { roleEquals: "client" },
        to: { roleEquals: "data" },
      },
      {
        id: "no-browser-to-internal-storage",
        name: "No Direct Browser Storage Access",
        description: "Browser nodes must not connect directly to private storage buckets.",
        severity: "error",
        type: "cannot-connect",
        from: { kindEquals: "browser" },
        to: { kindEquals: "storage" },
      },
    ],
  },
  microservicesGovernance: {
    id: "microservices-governance",
    name: "Microservices Governance",
    description: "Prevent synchronous request cycles and shared database anti-patterns",
    rules: [
      {
        id: "no-sync-request-cycles",
        name: "Forbidden Request Cycle",
        description: "Synchronous request flows (->) must not form cyclic dependencies between services.",
        severity: "error",
        type: "forbidden-cycle",
        edge: { kind: "request" },
      },
      {
        id: "gateway-enforcement",
        name: "API Gateway Required",
        description: "Architecture diagrams with 3 or more services should declare an API gateway.",
        severity: "warning",
        type: "must-have-role",
        from: { roleEquals: "gateway" },
        min: 1,
      },
    ],
  },
  securityBoundaries: {
    id: "security-boundaries",
    name: "Zero-Trust Security Boundaries",
    description: "Ensure external clients pass through auth and edge gateway tiers",
    rules: [
      {
        id: "auth-service-presence",
        name: "Authentication Component Presence",
        description: "Public-facing architectures should explicitly define an Auth or Identity provider.",
        severity: "info",
        type: "must-have-role",
        from: { roleEquals: "security" },
      },
    ],
  },
  deploymentOwnership: {
    id: "deployment-ownership",
    name: "Deployment Ownership & Regional Governance",
    description: "Ensure production stateful stores and services are guarded in explicit group perimeters",
    rules: [
      {
        id: "no-unprotected-public-database",
        name: "No Public Database Exposure",
        description: "Databases and stateful stores must not be directly accessed from public browser/mobile clients.",
        severity: "error",
        type: "cannot-connect",
        from: { roleEquals: "client" },
        to: { roleEquals: "data" },
      },
      {
        id: "no-cross-region-sync-bypasses",
        name: "Synchronous Request Cycle Prevention",
        description: "Synchronous requests must not form cycles across microservices.",
        severity: "error",
        type: "forbidden-cycle",
        edge: { kind: "request" },
      },
    ],
  },
};

export function validateArchitecture(
  ast: DiagramAST,
  rules: ArchitectureRule[] = [
    ...ARCH_RULE_PRESETS.cleanArchitecture.rules,
    ...ARCH_RULE_PRESETS.microservicesGovernance.rules,
  ]
): ArchitectureViolation[] {
  const violations: ArchitectureViolation[] = [];
  const nodes = Object.values(ast.nodes);
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const edges = extractAllEdges(ast);

  for (const rule of rules) {
    switch (rule.type) {
      case "cannot-connect": {
        for (const edge of edges) {
          const sourceNode = nodeMap.get(edge.from);
          const targetNode = nodeMap.get(edge.to);
          if (!sourceNode || !targetNode) continue;

          if (
            matchNode(sourceNode, rule.from) &&
            matchNode(targetNode, rule.to) &&
            matchEdge(edge, rule.edge)
          ) {
            violations.push({
              ruleId: rule.id,
              ruleName: rule.name,
              message:
                rule.description ||
                `Node "${sourceNode.id}" is forbidden from connecting to "${targetNode.id}"`,
              severity: rule.severity,
              nodeIds: [sourceNode.id, targetNode.id],
              edgeKeys: [`${edge.from}->${edge.to}`],
              line: edge.line,
            });
          }
        }
        break;
      }

      case "must-connect": {
        const sourceNodes = nodes.filter((n) => matchNode(n, rule.from));
        for (const src of sourceNodes) {
          const hasMatchingConnection = edges.some((edge) => {
            if (edge.from !== src.id) return false;
            const targetNode = nodeMap.get(edge.to);
            return targetNode ? matchNode(targetNode, rule.to) && matchEdge(edge, rule.edge) : false;
          });

          if (!hasMatchingConnection) {
            violations.push({
              ruleId: rule.id,
              ruleName: rule.name,
              message:
                rule.description ||
                `Node "${src.id}" must connect to a matching downstream component`,
              severity: rule.severity,
              nodeIds: [src.id],
              edgeKeys: [],
              line: src.line,
            });
          }
        }
        break;
      }

      case "forbidden-cycle": {
        const dtype = ast.meta?.type || (ast as any).config?.type || "architecture";
        const nonServiceArchetypes = ["state", "sequence", "layers", "flywheel", "loop", "venn"];
        if (nonServiceArchetypes.includes(dtype)) {
          break;
        }
        const cycleInfo = detectCycleInGraph(nodes, edges, rule.edge);
        if (cycleInfo) {
          violations.push({
            ruleId: rule.id,
            ruleName: rule.name,
            message: `${rule.description} (Cycle path: ${cycleInfo.path.join(" -> ")})`,
            severity: rule.severity,
            nodeIds: Array.from(new Set(cycleInfo.path)),
            edgeKeys: [],
            line: cycleInfo.line,
          });
        }
        break;
      }

      case "must-have-role": {
        const matching = nodes.filter((n) => matchNode(n, rule.from));
        const min = rule.min ?? 1;
        if (matching.length < min) {
          violations.push({
            ruleId: rule.id,
            ruleName: rule.name,
            message: rule.description,
            severity: rule.severity,
            nodeIds: [],
            edgeKeys: [],
            line: 1,
          });
        }
        break;
      }

      case "role-count-limit": {
        const matching = nodes.filter((n) => matchNode(n, rule.from));
        if (rule.max !== undefined && matching.length > rule.max) {
          violations.push({
            ruleId: rule.id,
            ruleName: rule.name,
            message: `${rule.description} (Found ${matching.length}, maximum allowed is ${rule.max})`,
            severity: rule.severity,
            nodeIds: matching.map((n) => n.id),
            edgeKeys: [],
            line: matching[0]?.line ?? 1,
          });
        }
        break;
      }
    }
  }

  return violations;
}

export interface MarkdyConfig {
  extends?: string[];
  rules?: (ArchitectureRule | string)[];
  severityOverrides?: Record<string, RuleSeverity>;
}

export function resolveArchitectureConfig(config?: MarkdyConfig | null): ArchitectureRule[] {
  if (!config) {
    return ARCH_RULE_PRESETS.cleanArchitecture.rules;
  }

  const rulesMap = new Map<string, ArchitectureRule>();

  if (config.extends) {
    for (const presetName of config.extends) {
      const preset = ARCH_RULE_PRESETS[presetName];
      if (preset) {
        for (const r of preset.rules) {
          rulesMap.set(r.id, { ...r });
        }
      }
    }
  }

  if (config.rules) {
    for (const ruleItem of config.rules) {
      if (typeof ruleItem === "string") {
        for (const preset of Object.values(ARCH_RULE_PRESETS)) {
          const found = preset.rules.find((r) => r.id === ruleItem);
          if (found) {
            rulesMap.set(found.id, { ...found });
            break;
          }
        }
      } else if (typeof ruleItem === "object" && ruleItem.id) {
        rulesMap.set(ruleItem.id, ruleItem);
      }
    }
  }

  if (config.severityOverrides) {
    for (const [ruleId, sev] of Object.entries(config.severityOverrides)) {
      const existing = rulesMap.get(ruleId);
      if (existing) {
        existing.severity = sev;
      }
    }
  }

  if (rulesMap.size === 0) {
    return ARCH_RULE_PRESETS.cleanArchitecture.rules;
  }

  return Array.from(rulesMap.values());
}

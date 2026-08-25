/**
 * packages/core/src/intellicode.ts
 * Markdy IntelliCode, Context-Aware Autocompletion, Predictive Flow & Architecture Suggestion Engine.
 * Zero external dependencies.
 */

import {
  NODE_KINDS,
  NODE_ALIASES,
  BEAT_CUE_KEYWORDS,
  DIAGRAM_TYPES,
  canonicalNodeKind,
  humanizeId,
  nodeRole,
} from "./registry.js";
import { THEMES } from "./themes.js";
import { TECHNICAL_NODE_TYPES, VISUAL_PRIMITIVE_TYPES } from "./system-vocabulary.js";
import { classifyTechnology } from "./classifier.js";
import { PLAYER_FLAT_KEYS, PLAYER_GROUPS } from "./player.js";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type IntelliCodeItemKind =
  | "keyword"
  | "directive"
  | "nodeKind"
  | "node"
  | "group"
  | "tech"
  | "flowOp"
  | "cue"
  | "selector"
  | "theme"
  | "layout"
  | "diagramType"
  | "attribute"
  | "snippet"
  | "value";

export interface IntelliCodeItem {
  label: string;
  insertText: string;
  kind: IntelliCodeItemKind;
  detail?: string;
  documentation?: string;
  isSnippet?: boolean;
  boost?: number;
  filterText?: string;
}

export interface ExtractedNode {
  id: string;
  kind: string;
  label: string;
  line: number;
}

export interface ExtractedGroup {
  id: string;
  label: string;
  members: string[];
  line: number;
}

export interface ExtractedBeat {
  id: string;
  label: string;
  line: number;
}

export interface DiagramContext {
  declaredNodes: ExtractedNode[];
  declaredGroups: ExtractedGroup[];
  declaredBeats: ExtractedBeat[];
  theme?: string;
  layout?: string;
  diagramType?: string;
  insideBeat: boolean;
  currentBeatName?: string;
  insideGroup: boolean;
  lineNo: number;
  lineText: string;
  linePrefix: string;
  tokenPrefix: string;
}

export interface GhostTextSuggestion {
  text: string;
  insertText: string;
  description: string;
  type: "next-flow" | "beat-cue" | "init-beat" | "next-node" | "group";
}

export interface ArchitectureRecommendation {
  id: string;
  title: string;
  desc: string;
  snippet: string;
  category: "performance" | "security" | "reliability" | "choreography" | "structure";
  actionLabel: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Tech Catalog for Smart Technology Completions
// ─────────────────────────────────────────────────────────────────────────────

export interface TechPreset {
  name: string;
  aliases: string[];
  kind: string;
  defaultId: string;
  label: string;
  desc: string;
  category: "database" | "cache" | "queue" | "gateway" | "client" | "compute" | "storage" | "security" | "ai";
}

export const POPULAR_TECHS: TechPreset[] = [
  // Databases
  { name: "PostgreSQL", aliases: ["postgres", "postgresql", "psql"], kind: "database", defaultId: "Postgres", label: "PostgreSQL 16", desc: "ACID relational SQL database", category: "database" },
  { name: "MySQL", aliases: ["mysql", "mariadb"], kind: "database", defaultId: "MySQL", label: "MySQL 8.0", desc: "Relational database", category: "database" },
  { name: "MongoDB", aliases: ["mongo", "mongodb"], kind: "database", defaultId: "MongoDB", label: "MongoDB Atlas", desc: "Document NoSQL database", category: "database" },
  { name: "DynamoDB", aliases: ["dynamo", "dynamodb"], kind: "database", defaultId: "DynamoDB", label: "AWS DynamoDB", desc: "Serverless key-value NoSQL", category: "database" },
  { name: "ClickHouse", aliases: ["clickhouse"], kind: "database", defaultId: "ClickHouse", label: "ClickHouse OLAP", desc: "Real-time columnar analytics", category: "database" },
  { name: "Snowflake", aliases: ["snowflake"], kind: "database", defaultId: "Snowflake", label: "Snowflake Data Warehouse", desc: "Cloud data warehouse", category: "database" },
  { name: "Neo4j", aliases: ["neo4j", "graphdb"], kind: "database", defaultId: "Neo4j", label: "Neo4j Graph Database", desc: "Property graph engine", category: "database" },
  { name: "Pinecone", aliases: ["pinecone", "weaviate", "qdrant", "chroma"], kind: "database", defaultId: "Pinecone", label: "Pinecone Vector DB", desc: "Vector similarity search for AI/RAG", category: "ai" },

  // Caching
  { name: "Redis", aliases: ["redis", "valkey", "dragonfly"], kind: "cache", defaultId: "Redis", label: "Redis Cluster", desc: "In-memory sub-millisecond cache", category: "cache" },
  { name: "Memcached", aliases: ["memcached"], kind: "cache", defaultId: "Memcached", label: "Memcached", desc: "Distributed memory object cache", category: "cache" },

  // Messaging & Streams
  { name: "Kafka", aliases: ["kafka", "redpanda", "confluent"], kind: "queue", defaultId: "Kafka", label: "Kafka Event Stream", desc: "High-throughput event bus", category: "queue" },
  { name: "RabbitMQ", aliases: ["rabbitmq", "amqp"], kind: "queue", defaultId: "RabbitMQ", label: "RabbitMQ Broker", desc: "AMQP message queue", category: "queue" },
  { name: "AWS SQS", aliases: ["sqs"], kind: "queue", defaultId: "SQS", label: "Amazon SQS", desc: "Managed queue service", category: "queue" },
  { name: "NATS", aliases: ["nats"], kind: "queue", defaultId: "NATS", label: "NATS JetStream", desc: "Lightweight cloud native pub/sub", category: "queue" },

  // Ingress & Gateways
  { name: "Kong", aliases: ["kong"], kind: "gateway", defaultId: "KongGateway", label: "Kong API Gateway", desc: "Cloud native API gateway", category: "gateway" },
  { name: "Envoy", aliases: ["envoy"], kind: "gateway", defaultId: "EnvoyProxy", label: "Envoy Service Proxy", desc: "High-performance edge/service proxy", category: "gateway" },
  { name: "Nginx", aliases: ["nginx"], kind: "gateway", defaultId: "Nginx", label: "Nginx Ingress", desc: "Reverse proxy & load balancer", category: "gateway" },
  { name: "Traefik", aliases: ["traefik"], kind: "gateway", defaultId: "Traefik", label: "Traefik Proxy", desc: "Dynamic reverse proxy for microservices", category: "gateway" },
  { name: "Cloudflare", aliases: ["cloudflare"], kind: "cdn", defaultId: "Cloudflare", label: "Cloudflare Edge / WAF", desc: "Edge CDN & security perimeter", category: "security" },

  // Clients & Frontends
  { name: "React Web App", aliases: ["react", "next", "nextjs", "frontend", "webapp"], kind: "browser", defaultId: "WebApp", label: "Next.js Web Client", desc: "React / Next.js web application", category: "client" },
  { name: "Mobile App", aliases: ["ios", "android", "flutter", "reactnative", "mobile"], kind: "mobile", defaultId: "MobileApp", label: "iOS / Android Mobile App", desc: "Native mobile client application", category: "client" },

  // Compute & Microservices
  { name: "API Service", aliases: ["service", "api", "backend", "microservice"], kind: "service", defaultId: "ApiService", label: "API Core Service", desc: "Backend REST/gRPC microservice", category: "compute" },
  { name: "Auth Service", aliases: ["auth", "auth0", "keycloak", "clerk", "cognito"], kind: "service", defaultId: "AuthService", label: "Auth & Identity Provider", desc: "OAuth2 / OIDC authentication service", category: "security" },
  { name: "Order Service", aliases: ["order", "ordersvc"], kind: "service", defaultId: "OrderService", label: "Order Processing Service", desc: "Transactional order service", category: "compute" },
  { name: "Payment Gateway", aliases: ["payment", "stripe", "paypal"], kind: "service", defaultId: "PaymentService", label: "Stripe Payment Gateway", desc: "Payment processing integration", category: "compute" },
  { name: "Async Worker", aliases: ["worker", "celery", "sidekiq"], kind: "worker", defaultId: "AsyncWorker", label: "Background Job Worker", desc: "Asynchronous task consumer worker", category: "compute" },
  { name: "Serverless Function", aliases: ["lambda", "function", "cloudfunction"], kind: "lambda", defaultId: "LambdaFunc", label: "AWS Lambda / Cloud Function", desc: "Event-driven serverless function", category: "compute" },
  { name: "Kubernetes Pod", aliases: ["k8s", "pod", "kubernetes"], kind: "pod", defaultId: "AppPod", label: "Kubernetes Pod Cluster", desc: "Containerized workload pod", category: "compute" },

  // AI & LLMs
  { name: "Gemini / LLM Engine", aliases: ["gemini", "openai", "gpt", "claude", "llm", "ai"], kind: "service", defaultId: "AIEngine", label: "Gemini 2.5 Flash / AI Core", desc: "Large Language Model inference engine", category: "ai" },

  // Storage & Backend as a Service
  { name: "S3 Object Storage", aliases: ["s3", "storage", "gcs", "blob", "r2"], kind: "storage", defaultId: "S3Storage", label: "AWS S3 / Cloud Storage", desc: "Object storage bucket", category: "storage" },
  { name: "Supabase", aliases: ["supabase"], kind: "database", defaultId: "SupabaseDB", label: "Supabase PostgreSQL", desc: "Open-source Firebase alternative with Postgres", category: "database" },
  { name: "Firebase Firestore", aliases: ["firebase", "firestore"], kind: "database", defaultId: "Firestore", label: "Firebase Firestore", desc: "Serverless real-time document database", category: "database" },

  // Observability & Telemetry
  { name: "Prometheus", aliases: ["prometheus", "metrics"], kind: "metric", defaultId: "Prometheus", label: "Prometheus Metrics", desc: "Time-series metrics monitoring engine", category: "compute" },
  { name: "Grafana", aliases: ["grafana", "dashboard"], kind: "surface", defaultId: "GrafanaUI", label: "Grafana Dashboard", desc: "Visualization & telemetry analytics dashboard", category: "compute" },
  { name: "OpenSearch / Elasticsearch", aliases: ["opensearch", "elasticsearch", "elastic"], kind: "database", defaultId: "OpenSearch", label: "OpenSearch Cluster", desc: "Distributed search & log analytics engine", category: "database" },
  { name: "Sentry", aliases: ["sentry", "errors"], kind: "service", defaultId: "Sentry", label: "Sentry Error Tracker", desc: "Application monitoring and error tracking", category: "compute" },
];

// ─────────────────────────────────────────────────────────────────────────────
// Document Parser & Context Extractor
// ─────────────────────────────────────────────────────────────────────────────

export function extractDiagramContext(text: string, cursorLine = 0, cursorCol = 0): DiagramContext {
  const lines = text.split(/\r?\n/);
  const declaredNodes: ExtractedNode[] = [];
  const declaredGroups: ExtractedGroup[] = [];
  const declaredBeats: ExtractedBeat[] = [];
  let theme: string | undefined;
  let layout: string | undefined;
  let diagramType: string | undefined;

  let insideBeat = false;
  let currentBeatName: string | undefined;
  let insideGroup = false;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    if (!trimmed || trimmed.startsWith("//")) continue;

    // Track directives
    const themeMatch = /theme\s*=\s*([a-zA-Z0-9_-]+)/.exec(trimmed);
    if (themeMatch) theme = themeMatch[1];
    const layoutMatch = /layout\s+([A-Z]{2})/.exec(trimmed);
    if (layoutMatch) layout = layoutMatch[1];
    const typeMatch = /type\s*=\s*([a-zA-Z0-9_-]+)/.exec(trimmed);
    if (typeMatch) diagramType = typeMatch[1];

    // Track beats
    const beatMatch = /^beat\s+([\w.-]+)(?:\s+"([^"]*)")?:/i.exec(trimmed);
    if (beatMatch) {
      declaredBeats.push({ id: beatMatch[1], label: beatMatch[2] || beatMatch[1], line: i });
      if (i <= cursorLine) {
        insideBeat = true;
        currentBeatName = beatMatch[1];
      }
      continue;
    }

    // Check if indent breaks out of beat
    if (insideBeat && i === cursorLine && !rawLine.startsWith(" ") && !rawLine.startsWith("\t") && trimmed) {
      if (!trimmed.startsWith("beat")) {
        insideBeat = false;
        currentBeatName = undefined;
      }
    }

    // Track groups
    const groupMatch = /^group\s+([\w.-]+)(?:\s+"([^"]*)")?:\s*(.*)$/i.exec(trimmed);
    if (groupMatch) {
      const members = groupMatch[3] ? groupMatch[3].trim().split(/\s+/) : [];
      declaredGroups.push({ id: groupMatch[1], label: groupMatch[2] || groupMatch[1], members, line: i });
      continue;
    }

    // Track nodes
    const nodeMatch = /^(\w[\w.-]*)\s+(\w[\w.-]*)(?:\s+"([^"]*)")?/i.exec(trimmed);
    if (nodeMatch) {
      const kind = nodeMatch[1].toLowerCase();
      const id = nodeMatch[2];
      const label = nodeMatch[3] || humanizeId(id);

      if (
        !["scene", "layout", "group", "beat", "style", "pattern", "use", "var", "edge", "theme"].includes(kind) &&
        (NODE_KINDS.has(kind as any) || NODE_KINDS.has(canonicalNodeKind(kind as any)) || (TECHNICAL_NODE_TYPES as readonly string[]).includes(kind))
      ) {
        declaredNodes.push({ id, kind, label, line: i });
      }
    }
  }

  const currentLineText = lines[cursorLine] ?? "";
  const linePrefix = currentLineText.slice(0, cursorCol);
  const tokenMatch = /[\w$.-><~]*$/.exec(linePrefix);
  const tokenPrefix = tokenMatch ? tokenMatch[0] : "";

  // Check if cursor is inside a beat
  let cursorInsideBeat = false;
  for (let i = cursorLine; i >= 0; i--) {
    const l = lines[i] ?? "";
    const trimL = l.trim();
    if (trimL.startsWith("//") || !trimL) continue;
    if (/^beat\s+[\w.-]+.*:/i.test(trimL)) {
      cursorInsideBeat = true;
      break;
    }
    if (/^(scene|layout|group|style|pattern|service|database|cache|queue|gateway|browser|mobile|client|worker|storage|cdn|pod|lambda|user)\b/i.test(trimL)) {
      cursorInsideBeat = false;
      break;
    }
  }

  return {
    declaredNodes,
    declaredGroups,
    declaredBeats,
    theme,
    layout,
    diagramType,
    insideBeat: cursorInsideBeat,
    currentBeatName,
    insideGroup,
    lineNo: cursorLine,
    lineText: currentLineText,
    linePrefix,
    tokenPrefix,
  };
}

function isClientRole(kind: string): boolean {
  return nodeRole(kind) === "client";
}

function isGatewayRole(kind: string): boolean {
  const c = canonicalNodeKind(kind);
  return ["gateway", "api_gateway", "proxy", "load_balancer", "cdn", "firewall", "waf"].includes(c);
}

function isComputeRole(kind: string): boolean {
  return nodeRole(kind) === "compute";
}

function isDatabaseKind(kind: string): boolean {
  const c = canonicalNodeKind(kind);
  return ["database", "db", "sql", "nosql", "warehouse", "table", "lake"].includes(c);
}

function isCacheKind(kind: string): boolean {
  const c = canonicalNodeKind(kind);
  return ["cache"].includes(c);
}

function isQueueRole(kind: string): boolean {
  return nodeRole(kind) === "messaging";
}

// ─────────────────────────────────────────────────────────────────────────────
// IntelliCode Autocompletion Provider
// ─────────────────────────────────────────────────────────────────────────────

export function getIntelliCodeCompletions(docText: string, cursorLine: number, cursorCol: number): IntelliCodeItem[] {
  const ctx = extractDiagramContext(docText, cursorLine, cursorCol);
  const items: IntelliCodeItem[] = [];

  // ── Context 1: After Flow Arrow (e.g. `Client -> `, `API ~> `) ─────────────
  const flowMatch = /([\w.-]+)\s*(->|<-|~>|<->|\.\.>)\s*([\w.-]*)$/.exec(ctx.linePrefix);
  if (flowMatch) {
    const sourceNodeId = flowMatch[1];
    const op = flowMatch[2];
    const filter = flowMatch[3].toLowerCase();

    const sourceNode = ctx.declaredNodes.find((n) => n.id === sourceNodeId);
    const sourceKind = sourceNode ? sourceNode.kind : "service";

    // Target node completions with predictive rank boosting
    for (const node of ctx.declaredNodes) {
      if (node.id === sourceNodeId && op !== "<->") continue; // Avoid trivial self-flows unless bidirectional

      let boost = 2;

      // IntelliCode Predictive Weighting:
      // Client -> Gateway / Service (high)
      // Gateway -> Service (high)
      // Service -> Database / Cache / Queue (high)
      // Queue -> Worker (high)
      if (isClientRole(sourceKind)) {
        if (isGatewayRole(node.kind)) boost = 10;
        else if (isComputeRole(node.kind)) boost = 8;
        else boost = 2;
      } else if (isGatewayRole(sourceKind)) {
        if (isComputeRole(node.kind)) boost = 10;
        else boost = 3;
      } else if (isComputeRole(sourceKind)) {
        if (isDatabaseKind(node.kind) || isCacheKind(node.kind) || isQueueRole(node.kind)) boost = 10;
        else if (isComputeRole(node.kind)) boost = 7;
        else boost = 3;
      } else if (isQueueRole(sourceKind)) {
        if (isComputeRole(node.kind)) boost = 10;
        else boost = 2;
      }

      // Response edge weighting
      if (op === "<-") {
        boost = (isClientRole(node.kind) || isGatewayRole(node.kind)) ? 10 : 3;
      }

      items.push({
        label: node.id,
        insertText: `${node.id} `,
        kind: "node",
        detail: `${node.kind} · "${node.label}"`,
        documentation: `Connect flow ${sourceNodeId} ${op} ${node.id}`,
        boost,
      });
    }

    // Common flow label snippets
    if (!filter || filter.startsWith('"')) {
      const sourceRole = nodeRole(sourceKind as any);
      const sampleLabels = getCommonEdgeLabels(sourceRole, op);
      for (const lbl of sampleLabels) {
        items.push({
          label: `"${lbl}"`,
          insertText: `"${lbl}"`,
          kind: "snippet",
          detail: "Flow description label",
          boost: 1,
        });
      }
    }

    return items;
  }

  // ── Context 2: After Node ID on Beat/Flow Line (e.g. `Client `) ─────────────
  const nodeStartMatch = /^\s*([\w.-]+)\s+$/.exec(ctx.linePrefix);
  if (nodeStartMatch) {
    const candidateId = nodeStartMatch[1];
    const isDeclared = ctx.declaredNodes.some((n) => n.id === candidateId);

    if (isDeclared) {
      // Offer flow operators
      items.push(
        { label: "->", insertText: "-> ", kind: "flowOp", detail: "Sync request / call", documentation: "Synchronous HTTP, gRPC, or RPC call.", boost: 10 },
        { label: "~>", insertText: "~> ", kind: "flowOp", detail: "Async event / pub-sub", documentation: "Asynchronous event stream or message queue dispatch.", boost: 9 },
        { label: "<-", insertText: "<- ", kind: "flowOp", detail: "Response / return payload", documentation: "Synchronous return response payload.", boost: 8 },
        { label: "<->", insertText: "<-> ", kind: "flowOp", detail: "Bidirectional streaming / mTLS", documentation: "Two-way streaming WebSocket or mutual TLS socket.", boost: 7 },
        { label: "..>", insertText: "..> ", kind: "flowOp", detail: "Weak dependency link", documentation: "Dashed architectural dependency relationship.", boost: 6 }
      );
      return items;
    }
  }

  // ── Context 3: After `theme=` or `theme ` ─────────────────────────────────
  if (/(theme\s*=\s*|theme\s+)\w*$/i.test(ctx.linePrefix)) {
    const themeEntries = [
      { name: "paper", desc: "Warm editorial white canvas with crisp modern typography" },
      { name: "midnight", desc: "Deep OLED dark theme with vibrant neon kinetic pulses" },
      { name: "blueprint", desc: "Architectural blueprint cyan graph styling" },
      { name: "nebula", desc: "Futuristic cosmic purple & indigo glow palette" },
      { name: "editorial", desc: "High-contrast serif luxury publication layout" },
      { name: "graphite", desc: "Sleek slate monochrome engineering aesthetic" },
      { name: "terminal", desc: "Retro phosphor CRT hacker terminal green on black" },
      { name: "sketchy", desc: "Hand-drawn sketchy whiteboard marker design" },
    ];
    for (const t of themeEntries) {
      items.push({
        label: t.name,
        insertText: t.name,
        kind: "theme",
        detail: `theme=${t.name}`,
        documentation: t.desc,
        boost: 10,
      });
    }
    return items;
  }

  // ── Context 4: After `layout ` or `direction=` ─────────────────────────────
  if (/(layout\s+|direction\s*=\s*)\w*$/i.test(ctx.linePrefix)) {
    items.push(
      { label: "LR", insertText: "LR", kind: "layout", detail: "Left-to-Right", documentation: "Horizontal left-to-right system flow layout.", boost: 10 },
      { label: "TB", insertText: "TB", kind: "layout", detail: "Top-to-Bottom", documentation: "Vertical top-to-bottom hierarchy layout.", boost: 9 },
      { label: "RL", insertText: "RL", kind: "layout", detail: "Right-to-Left", documentation: "Right-to-left reverse topology layout.", boost: 5 },
      { label: "BT", insertText: "BT", kind: "layout", detail: "Bottom-to-Top", documentation: "Bottom-to-top inverted stack layout.", boost: 5 }
    );
    return items;
  }

  // ── Context 5: After `type=` ──────────────────────────────────────────────
  if (/type\s*=\s*\w*$/i.test(ctx.linePrefix)) {
    for (const t of DIAGRAM_TYPES) {
      items.push({
        label: t,
        insertText: t,
        kind: "diagramType",
        detail: `type=${t}`,
        documentation: `Specialized layout engine: ${t}`,
        boost: 8,
      });
    }
    return items;
  }

  // ── Context 6: After Cue Keywords (e.g. `show `, `glow `, `pulse `, `frame `, `focus `, `hide `)
  const cueMatch = /^\s*(show|glow|pulse|focus|frame|hide)\s+([\w$]*)$/i.exec(ctx.linePrefix);
  if (cueMatch) {
    const cueName = cueMatch[1].toLowerCase();

    // Selectors
    items.push(
      { label: "$nodes", insertText: "$nodes stagger=60ms", kind: "selector", detail: "All diagram nodes", documentation: "Selects all semantic nodes in the scene.", boost: 10 },
      { label: "$title", insertText: "$title", kind: "selector", detail: "Diagram title banner", documentation: "Selects the title node.", boost: 8 },
      { label: "$edges", insertText: "$edges", kind: "selector", detail: "All edge connectors", documentation: "Selects all flow connectors.", boost: 7 }
    );

    // Declared Nodes
    for (const node of ctx.declaredNodes) {
      items.push({
        label: node.id,
        insertText: `${node.id} `,
        kind: "node",
        detail: `${node.kind} · "${node.label}"`,
        boost: 9,
      });
    }

    // Declared Groups
    for (const group of ctx.declaredGroups) {
      items.push({
        label: group.id,
        insertText: cueName === "frame" ? `${group.id} zoom=1.2 dur=600ms` : `${group.id} `,
        kind: "group",
        detail: `group "${group.label}"`,
        documentation: `Group boundary with ${group.members.length} nodes.`,
        boost: 8,
      });
    }

    // Cue Modifiers
    if (cueName === "show" || cueName === "hide") {
      items.push({ label: "stagger=60ms", insertText: "stagger=60ms", kind: "attribute", detail: "Stagger delay", boost: 5 });
    } else if (cueName === "glow" || cueName === "pulse") {
      items.push(
        { label: "color=#38bdf8", insertText: "color=#38bdf8", kind: "attribute", detail: "Sky blue kinetic glow", boost: 5 },
        { label: "color=#e11d48", insertText: "color=#e11d48", kind: "attribute", detail: "Alert crimson pulse", boost: 5 },
        { label: "color=#10b981", insertText: "color=#10b981", kind: "attribute", detail: "Success emerald glow", boost: 5 }
      );
    } else if (cueName === "frame") {
      items.push(
        { label: "zoom=1.2 dur=600ms", insertText: "zoom=1.2 dur=600ms", kind: "attribute", detail: "Camera focus & zoom", boost: 5 }
      );
    }

    return items;
  }

  // ── Context 7: Inside `beat` block ─────────────────────────────────────────
  if (ctx.insideBeat) {
    // Cue Keywords
    for (const cue of BEAT_CUE_KEYWORDS) {
      const aliasTarget = (cue === "pulse" ? "focus" : cue === "highlight" ? "glow" : cue);
      items.push({
        label: cue,
        insertText: cue === "show" ? "show $nodes stagger=60ms" : `${cue} `,
        kind: "cue",
        detail: `Choreography cue (${aliasTarget})`,
        documentation: `Execute kinetic choreography action: ${cue}`,
        boost: 8,
      });
    }

    // Declared nodes for flow start
    for (const node of ctx.declaredNodes) {
      items.push({
        label: node.id,
        insertText: `${node.id} -> `,
        kind: "node",
        detail: `Start flow from ${node.kind} "${node.label}"`,
        boost: 9,
      });
    }

    // Selectors
    items.push(
      { label: "$nodes", insertText: "$nodes", kind: "selector", detail: "Selector for all nodes", boost: 6 },
      { label: "$title", insertText: "$title", kind: "selector", detail: "Diagram title", boost: 5 }
    );

    return items;
  }

  // ── Context 8: Top-Level / Root Scope (Directives, Nodes, Tech Snippets, Beats) ───

  // Top-Level Directives & Snippets
  items.push(
    { label: "scene", insertText: 'scene theme=paper layout=LR\n', kind: "keyword", detail: "Scene directive", documentation: "Declare scene configuration, theme, and layout direction.", boost: 10 },
    { label: "layout LR", insertText: "layout LR\n", kind: "directive", detail: "Horizontal layout", documentation: "Left-to-right topology layout.", boost: 10 },
    { label: "layout TB", insertText: "layout TB\n", kind: "directive", detail: "Vertical hierarchy layout", documentation: "Top-to-bottom hierarchy layout.", boost: 9 },
    { label: "theme midnight", insertText: "theme=midnight\n", kind: "directive", detail: "Dark theme", documentation: "High-contrast dark mode with neon accents.", boost: 8 },
    { label: "theme paper", insertText: "theme=paper\n", kind: "directive", detail: "Editorial light theme", documentation: "Clean light mode with high-legibility typography.", boost: 8 },
    { label: "group", insertText: 'group ${1:subsystem} "${2:Subsystem Perimeter}": ${3:Node1} ${4:Node2}\n', kind: "snippet", isSnippet: true, detail: "Group boundary", documentation: "Perimeter enclosing related subsystems.", boost: 8 },
    { label: "beat", insertText: 'beat ${1:main} "${2:System Flow}":\n  show $nodes stagger=60ms\n  ${0}\n', kind: "snippet", isSnippet: true, detail: "Kinetic narrative beat", documentation: "Defines an animated step in the diagram choreography.", boost: 9 },
    { label: "pattern", insertText: 'pattern ${1:retry_flow} "${2:Retry Pattern}":\n  ${3:Service} -> ${4:Queue} "retry"\n', kind: "snippet", isSnippet: true, detail: "Reusable flow pattern", documentation: "Defines a reusable architectural interaction pattern.", boost: 6 },
    { label: "use pattern", insertText: "use pattern=${1:retry_flow}\n", kind: "directive", detail: "Instantiate pattern", documentation: "Reuses a declared flow pattern in the current scope.", boost: 6 },
    { label: "style", insertText: 'style ${1:NodeId} fill=${2:#38bdf8} stroke=${3:#0284c7}\n', kind: "snippet", isSnippet: true, detail: "Custom node styling", boost: 5 },
    { label: "var", insertText: "var ${1:key} = ${2:value}\n", kind: "snippet", isSnippet: true, detail: "Declare variable", boost: 4 }
  );

  // Semantic Node Kinds & Snippets
  const nodeKindsList = [
    { kind: "service", id: "ApiService", label: "API Service", desc: "Microservice / REST / gRPC backend" },
    { kind: "database", id: "Database", label: "PostgreSQL Database", desc: "Relational or NoSQL database store" },
    { kind: "cache", id: "RedisCache", label: "In-Memory Cache", desc: "High-speed in-memory cache" },
    { kind: "queue", id: "MessageQueue", label: "Kafka Event Stream", desc: "Pub/Sub message broker or event stream" },
    { kind: "gateway", id: "ApiGateway", label: "API Gateway", desc: "Ingress proxy and perimeter router" },
    { kind: "browser", id: "WebApp", label: "Web Client", desc: "End-user web browser application" },
    { kind: "mobile", id: "MobileApp", label: "Mobile Application", desc: "iOS / Android native mobile app" },
    { kind: "worker", id: "BackgroundWorker", label: "Async Task Worker", desc: "Background job execution worker" },
    { kind: "storage", id: "ObjectStorage", label: "S3 Object Store", desc: "Blob / document cloud storage" },
    { kind: "cdn", id: "EdgeCDN", label: "Cloudflare Edge", desc: "Global content delivery network" },
    { kind: "firewall", id: "WAF", label: "Security Perimeter", desc: "Web application firewall & DDoS shield" },
    { kind: "lambda", id: "ServerlessFunc", label: "Serverless Function", desc: "Event-driven serverless function" },
    { kind: "pod", id: "AppPod", label: "Kubernetes Pod", desc: "Containerized workload pod" },
    { kind: "user", id: "Customer", label: "End User", desc: "Human user / customer actor" },
  ];

  for (const n of nodeKindsList) {
    items.push({
      label: n.kind,
      insertText: `${n.kind} \${1:${n.id}} "\${2:${n.label}}"`,
      kind: "nodeKind",
      isSnippet: true,
      detail: `Node kind → ${n.kind}`,
      documentation: n.desc,
      boost: 7,
    });
  }

  // Visual Primitives
  for (const vp of VISUAL_PRIMITIVE_TYPES) {
    items.push({
      label: vp,
      insertText: `${vp} \${1:${humanizeId(vp).replace(/\s+/g, '')}} "\${2:${humanizeId(vp)}}"`,
      kind: "nodeKind",
      isSnippet: true,
      detail: `Visual primitive → ${vp}`,
      boost: 4,
    });
  }

  // Popular Technology IntelliCode Snippets (e.g. typing "postgres", "redis", "kafka", "k8s")
  for (const tech of POPULAR_TECHS) {
    items.push({
      label: tech.name,
      insertText: `${tech.kind} ${tech.defaultId} "${tech.label}"\n`,
      kind: "tech",
      detail: `⚡ ${tech.kind} · ${tech.name}`,
      documentation: `${tech.desc}\n\nInserts semantic ${tech.kind} node definition.`,
      filterText: `${tech.name} ${tech.aliases.join(' ')} ${tech.kind}`,
      boost: 6,
    });
  }

  // Declared nodes (if user wants to reference them in groups or styles)
  for (const node of ctx.declaredNodes) {
    items.push({
      label: node.id,
      insertText: node.id,
      kind: "node",
      detail: `${node.kind} · "${node.label}"`,
      boost: 5,
    });
  }

  return items;
}

function getCommonEdgeLabels(sourceKind: string, op: string): string[] {
  if (op === "<-") {
    return ["200 OK", "201 Created", "Cached Response", "Result Payload", "JWT Token"];
  }
  if (op === "~>") {
    return ["order.created", "user.signup", "event.published", "telemetry.metric", "task.enqueue"];
  }
  if (op === "<->") {
    return ["WebSocket / Streaming", "mTLS Bidirectional", "gRPC Bidirectional Stream"];
  }
  if (op === "..>") {
    return ["depends on", "reads schema", "replicates to", "monitors"];
  }

  if (isClientRole(sourceKind)) {
    return ["POST /api/v1/checkout", "GET /api/v1/user", "POST /auth/login", "GraphQL Query"];
  }
  if (isGatewayRole(sourceKind)) {
    return ["Route /v1/orders", "Authorize & Forward", "Proxy Request"];
  }
  if (isComputeRole(sourceKind)) {
    return ["SELECT * FROM orders", "SET cache:key", "GET cache:key", "Publish Event", "Verify Token"];
  }
  if (isQueueRole(sourceKind)) {
    return ["Consume Message", "Process Batch", "Deliver Payload"];
  }
  return ["call", "request", "query", "sync"];
}

// ─────────────────────────────────────────────────────────────────────────────
// Predictive Ghost-Text / Next-Line Suggestion Engine
// ─────────────────────────────────────────────────────────────────────────────

export function predictNextLineSuggestion(docText: string, cursorLine: number): GhostTextSuggestion | null {
  const ctx = extractDiagramContext(docText, cursorLine, 0);
  const totalNodes = ctx.declaredNodes.length;

  // 1. If document is empty or only scene/layout, suggest initial client & gateway
  if (totalNodes === 0) {
    return {
      text: 'browser WebApp "Web Application"',
      insertText: 'browser WebApp "Web Application"\nservice ApiGw "API Gateway Service"\n\nbeat main "System Entrance":\n  show $nodes stagger=60ms\n  WebApp -> ApiGw "POST /api"\n',
      description: "Start with an entry client and API Gateway with entrance choreography",
      type: "next-node",
    };
  }

  // 2. If nodes exist, but no beats have been written yet, suggest initialization beat
  if (totalNodes >= 2 && ctx.declaredBeats.length === 0 && !ctx.insideBeat) {
    const n1 = ctx.declaredNodes[0];
    const n2 = ctx.declaredNodes[1];
    return {
      text: `beat main "System Flow":\n  show $nodes stagger=60ms\n  ${n1.id} -> ${n2.id} "call"`,
      insertText: `beat main "System Flow":\n  show $nodes stagger=60ms\n  ${n1.id} -> ${n2.id} "call"\n`,
      description: "Initialize choreography with entrance animation and primary flow",
      type: "init-beat",
    };
  }

  // 3. Inside a beat: predict next logical flow or return edge
  if (ctx.insideBeat) {
    // Look at previous line in current beat
    const lines = docText.split(/\r?\n/);
    const prevLine = lines[cursorLine - 1]?.trim() ?? "";

    // If previous line was `A -> B "req"`, suggest `A <- B "200 OK"`
    const reqMatch = /^([\w.-]+)\s*->\s*([\w.-]+)(?:\s+"([^"]*)")?/i.exec(prevLine);
    if (reqMatch) {
      const src = reqMatch[1];
      const tgt = reqMatch[2];
      return {
        text: `  ${src} <- ${tgt} "200 OK"`,
        insertText: `  ${src} <- ${tgt} "200 OK"\n`,
        description: `Add response flow returning from ${tgt} to ${src}`,
        type: "next-flow",
      };
    }

    // If previous line was `A ~> Queue "event"`, suggest `Queue ~> Worker "consume"`
    const eventMatch = /^([\w.-]+)\s*~>\s*([\w.-]+)/i.exec(prevLine);
    if (eventMatch) {
      const queueId = eventMatch[2];
      const worker = ctx.declaredNodes.find((n) => nodeRole(n.kind) === "compute" && n.id !== eventMatch[1]);
      if (worker) {
        return {
          text: `  ${queueId} ~> ${worker.id} "process"`,
          insertText: `  ${queueId} ~> ${worker.id} "process"\n`,
          description: `Deliver queued event from ${queueId} to worker ${worker.id}`,
          type: "next-flow",
        };
      }
    }

    // Default beat suggestion: pulse or glow on key service
    const keyNode = ctx.declaredNodes.find((n) => nodeRole(n.kind) === "compute" || nodeRole(n.kind) === "database") || ctx.declaredNodes[0];
    if (keyNode) {
      return {
        text: `  pulse ${keyNode.id} color=#38bdf8`,
        insertText: `  pulse ${keyNode.id} color=#38bdf8\n`,
        description: `Add kinetic highlight pulse to ${keyNode.id}`,
        type: "beat-cue",
      };
    }
  }

  // 4. In top-level: suggest complementary architectural tier
  const hasClient = ctx.declaredNodes.some((n) => isClientRole(n.kind));
  const hasCompute = ctx.declaredNodes.some((n) => isComputeRole(n.kind) || isGatewayRole(n.kind));
  const hasDB = ctx.declaredNodes.some((n) => isDatabaseKind(n.kind));
  const hasCache = ctx.declaredNodes.some((n) => isCacheKind(n.kind));
  const hasQueue = ctx.declaredNodes.some((n) => isQueueRole(n.kind));

  if (hasCompute && !hasDB) {
    return {
      text: 'database Postgres "PostgreSQL 16"',
      insertText: 'database Postgres "PostgreSQL 16"\n',
      description: "Add a database tier to persist state for your services",
      type: "next-node",
    };
  }

  if (hasCompute && hasDB && !hasCache) {
    return {
      text: 'cache Redis "Redis Cluster"',
      insertText: 'cache Redis "Redis Cluster"\n',
      description: "Add an in-memory caching tier to accelerate query latency",
      type: "next-node",
    };
  }

  if (hasCompute && hasDB && !hasQueue) {
    return {
      text: 'queue Kafka "Kafka Event Stream"',
      insertText: 'queue Kafka "Kafka Event Stream"\nworker AsyncWorker "Background Worker"\n',
      description: "Add an asynchronous event queue and worker for decoupled processing",
      type: "next-node",
    };
  }

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Proactive Architecture Recommendations Engine
// ─────────────────────────────────────────────────────────────────────────────

export function getArchitectureSuggestions(docText: string): ArchitectureRecommendation[] {
  const ctx = extractDiagramContext(docText, 0, 0);
  const recommendations: ArchitectureRecommendation[] = [];

  const nodeCount = ctx.declaredNodes.length;
  if (nodeCount === 0) return recommendations;

  const hasClient = ctx.declaredNodes.some((n) => isClientRole(n.kind));
  const hasGateway = ctx.declaredNodes.some((n) => isGatewayRole(n.kind));
  const hasServices = ctx.declaredNodes.filter((n) => isComputeRole(n.kind));
  const hasDatabases = ctx.declaredNodes.filter((n) => isDatabaseKind(n.kind));
  const hasCache = ctx.declaredNodes.some((n) => isCacheKind(n.kind));
  const hasQueue = ctx.declaredNodes.some((n) => isQueueRole(n.kind));
  const hasGroups = ctx.declaredGroups.length > 0;
  const hasBeats = ctx.declaredBeats.length > 0;

  // 1. Ingress Protection: If client talks directly to backend service or database without Gateway
  if (hasClient && (hasServices.length > 0 || hasDatabases.length > 0) && !hasGateway) {
    recommendations.push({
      id: "add-gateway",
      title: "Add API Gateway Perimeter",
      desc: "Direct client-to-service connections bypass centralized rate-limiting and auth. Insert an API Gateway.",
      snippet: 'gateway ApiGateway "Kong / Envoy Gateway"\n\nbeat route:\n  WebApp -> ApiGateway "HTTPS"\n',
      category: "security",
      actionLabel: "Insert Gateway",
    });
  }

  // 2. High-Throughput Caching Layer
  if (hasDatabases.length > 0 && !hasCache) {
    recommendations.push({
      id: "add-cache",
      title: "Add In-Memory Cache (Redis)",
      desc: "Offload frequent read queries from your database with a sub-millisecond Redis cluster.",
      snippet: 'cache Redis "Redis Cluster"\n\nbeat cache_layer:\n  ApiService -> Redis "cache.get"\n',
      category: "performance",
      actionLabel: "Insert Redis Cache",
    });
  }

  // 3. Subsystem Boundary Groups
  if (hasServices.length >= 2 && !hasGroups) {
    const memberIds = hasServices.map((s) => s.id).join(" ");
    recommendations.push({
      id: "add-group-boundary",
      title: "Enclose Microservices in Group Boundary",
      desc: "Group related backend microservices inside a secure VPC boundary perimeter.",
      snippet: `group backend "Backend Microservices VPC": ${memberIds}\n`,
      category: "structure",
      actionLabel: "Add Group Boundary",
    });
  }

  // 4. Kinetic Choreography Beats
  if (!hasBeats && nodeCount >= 2) {
    const firstTwo = ctx.declaredNodes.slice(0, 2);
    recommendations.push({
      id: "add-entrance-beat",
      title: "Add Animated Entrance Choreography",
      desc: "Bring your architecture to life with staggered node reveals and motion flows.",
      snippet: `beat reveal "System Entrance":\n  show $nodes stagger=60ms\n  ${firstTwo[0].id} -> ${firstTwo[1].id} "GET /api"\n`,
      category: "choreography",
      actionLabel: "Add Narrative Beat",
    });
  }

  // 5. Asynchronous Decoupling (Queue)
  if (hasServices.length >= 2 && !hasQueue) {
    recommendations.push({
      id: "add-event-queue",
      title: "Decouple Services with Event Queue",
      desc: "Use an asynchronous event stream (Kafka/SQS) for resilient pub/sub event handling.",
      snippet: 'queue Kafka "Kafka Event Bus"\nworker Worker "Event Consumer"\n\nbeat async_event:\n  ApiService ~> Kafka "event.published"\n  Kafka ~> Worker "process"\n',
      category: "reliability",
      actionLabel: "Add Kafka Queue",
    });
  }

  return recommendations;
}

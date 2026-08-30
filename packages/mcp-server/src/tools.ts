/**
 * packages/mcp-server/src/tools.ts
 * MCP Tool definitions, Resource handlers, and Prompt workflows for Markdy.
 */

import {
  parse,
  validateArchitecture,
  analyzeAndBuildRepairPrompt,
  diagnoseMarkdyCode,
  repairMarkdyCode,
  getIntelliCodeCompletions,
  predictNextLineSuggestion,
  getArchitectureSuggestions,
  ARCH_RULE_PRESETS,
} from "@markdy/core";
import {
  transpileMermaidToMarkdy,
  transpileDockerComposeToMarkdy,
  transpileKubernetesManifestsToMarkdy,
  transpileTerraformStateToMarkdy,
  transpileDrawioToMarkdy,
} from "@markdy/compat";

export interface ToolResult {
  [x: string]: unknown;
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
}

export interface ResourceResult {
  [x: string]: unknown;
  contents: Array<{
    uri: string;
    mimeType?: string;
    text: string;
  }>;
}

export interface PromptResult {
  [x: string]: unknown;
  description?: string;
  messages: Array<{
    role: "user" | "assistant";
    content: {
      type: "text";
      text: string;
    };
  }>;
}

export const ARCHITECTURE_TEMPLATES = [
  {
    id: "microservices-db",
    title: "Cloud Microservices & Database Tier",
    category: "Cloud / Microservices",
    description: "Multi-tier microservices architecture with API gateway, auth, database, and Redis cache.",
    code: `scene theme=paper
layout LR

browser WebApp "Web Application"
mobile MobileApp "Mobile Client"
gateway ApiGateway "Cloud Gateway"
auth AuthService "Auth / OAuth2"
service OrderService "Order Service"
service PaymentService "Payment Gateway"
database MainDB "PostgreSQL"
cache RedisCache "Redis Cluster"

group clients "User Surfaces": WebApp MobileApp
group backend "Service Tier": ApiGateway AuthService OrderService PaymentService
group dataTier "Data Tier": MainDB RedisCache

beat reveal "System Overview":
  show $nodes stagger=40ms

beat authFlow "Authenticate Request":
  frame clients ApiGateway AuthService zoom=1.12
  WebApp -> ApiGateway "GET /profile" -> AuthService "validate_jwt"
  WebApp <- ApiGateway "200 OK (Claims)"

beat checkout "Process Order":
  frame ApiGateway OrderService PaymentService dataTier zoom=1.1
  MobileApp -> ApiGateway "POST /checkout" -> OrderService "create_order"
  OrderService -> RedisCache "check inventory"
  OrderService -> PaymentService "authorize charge"
  PaymentService -> MainDB "record transaction"
  MobileApp <- ApiGateway "201 Created"`,
  },
  {
    id: "ai-rag-pipeline",
    title: "AI Agent & RAG Pipeline",
    category: "AI / Machine Learning",
    description: "Retrieval-Augmented Generation agent flow with embedding vector search, LLM synthesis, and sandbox tool execution.",
    code: `scene theme=editorial
layout LR

user User "Engineer"
browser ChatUI "Chat Interface"
service Orchestrator "Agent Orchestrator"
service Embedder "Embedding Model"
database VectorDB "Vector Index (Qdrant)"
service LLM "Claude 3.5 / Gemini"
service Tools "Tool Execution Engine"

group aiCore "Intelligence Engine": Embedder VectorDB LLM
group execution "Tools & Sandbox": Tools

beat init "System Reveal":
  show $nodes stagger=50ms

beat retrieve "Query & Vector Search":
  frame User ChatUI Orchestrator aiCore zoom=1.12
  User -> ChatUI "Ask technical question" -> Orchestrator "parse intent"
  Orchestrator -> Embedder "embed(query)" -> VectorDB "cosine search (k=5)"
  Orchestrator <- VectorDB "retrieved context chunks"

beat generate "Synthesis & Tool Execution":
  frame Orchestrator LLM Tools zoom=1.15
  Orchestrator -> LLM "prompt + context"
  LLM -> Tools "execute_code(sql)"
  LLM <- Tools "tool_result"
  ChatUI <- Orchestrator "streamed response with citations"
  glow ChatUI color=#10b981`,
  },
  {
    id: "kafka-event-driven",
    title: "Event-Driven Architecture & Kafka Fan-Out",
    category: "Messaging / Streaming",
    description: "Event ingestion and parallel asynchronous consumer worker fan-out with dead-letter queue.",
    code: `scene theme=midnight
layout LR

service IngestionAPI "Ingestion API"
queue KafkaTopic "orders.events"
worker InventoryWorker "Inventory Worker"
worker NotificationWorker "Email/SMS Worker"
worker AnalyticsWorker "Clickhouse Sink"
database InventoryDB "Inventory DB"
database AnalyticsDB "Clickhouse"
queue DLQ "Dead Letter Queue"

group workers "Consumer Worker Group": InventoryWorker NotificationWorker AnalyticsWorker

beat reveal "Topology":
  show $nodes stagger=40ms

beat publish "Publish Event":
  frame IngestionAPI KafkaTopic zoom=1.15
  IngestionAPI ~> KafkaTopic "publish(OrderPlaced)"
  glow KafkaTopic color=#38bdf8

beat fanout "Parallel Fan-out Processing":
  frame KafkaTopic workers zoom=1.12
  KafkaTopic ~> InventoryWorker "consume event" & KafkaTopic ~> NotificationWorker "consume event" & KafkaTopic ~> AnalyticsWorker "consume event"
  InventoryWorker -> InventoryDB "UPDATE stock"
  AnalyticsWorker -> AnalyticsDB "INSERT analytics"`,
  },
  {
    id: "k8s-ingress-cluster",
    title: "Kubernetes Cluster & Cloud Ingress",
    category: "DevOps / Infrastructure",
    description: "Cloudflare edge, Traefik ingress controller, pod deployments, ClusterIP routing, and persistent storage volumes.",
    code: `scene theme=blueprint
layout LR

cloud CDN "Cloudflare CDN"
network Ingress "Traefik Ingress Controller"
pod WebPod1 "web-frontend-pod-1"
pod WebPod2 "web-frontend-pod-2"
service ClusterIP "api-service (ClusterIP)"
pod ApiPod1 "api-backend-pod-1"
pod ApiPod2 "api-backend-pod-2"
storage PV "Ceph CSI Volume"

group frontendPods "Frontend Deployment": WebPod1 WebPod2
group apiPods "API Deployment": ApiPod1 ApiPod2

beat reveal "Cluster Architecture":
  show $nodes stagger=40ms

beat routing "Ingress Traffic Routing":
  frame CDN Ingress frontendPods zoom=1.12
  CDN -> Ingress "HTTPS Request" -> WebPod1 "reverse proxy"
  WebPod1 -> ClusterIP "internal call" -> ApiPod1 "gRPC invocation"
  ApiPod1 -> PV "read/write volume"
  CDN <- Ingress "200 HTTP OK"`,
  },
  {
    id: "cicd-gitops-pipeline",
    title: "CI/CD GitOps Delivery Pipeline",
    category: "DevOps / CI-CD",
    description: "GitHub commits, automated GitHub Actions testing, container registry push, and ArgoCD production deployment.",
    code: `scene theme=graphite
layout LR

user Dev "Developer"
service GitHub "GitHub Repository"
worker Actions "GitHub Actions CI"
registry DockerHub "Container Registry"
service ArgoCD "ArgoCD Controller"
cluster Production "Kubernetes Prod"

beat reveal "Pipeline Infrastructure":
  show $nodes stagger=45ms

beat build "Commit & Build Validation":
  frame Dev GitHub Actions DockerHub zoom=1.12
  Dev -> GitHub "git push origin main"
  GitHub ~> Actions "trigger workflow"
  Actions -> Actions "run unit & visual tests"
  Actions -> DockerHub "docker push image:v1.0.7"
  glow DockerHub color=#10b981

beat deploy "GitOps Sync & Deployment":
  frame DockerHub ArgoCD Production zoom=1.15
  ArgoCD -> GitHub "detect manifest drift"
  ArgoCD -> DockerHub "pull image:v1.0.7"
  ArgoCD -> Production "apply rollout"
  glow Production color=#22c55e`,
  },
  {
    id: "oauth2-oidc-flow",
    title: "OAuth2 / OIDC Authentication Flow",
    category: "Security / Identity",
    description: "End-to-end authorization code grant flow with IdP redirect, consent, token exchange, and protected API access.",
    code: `scene theme=paper
layout LR

browser User "End User Browser"
service ClientApp "OAuth Client App"
auth IdP "Identity Provider (Auth0/Okta)"
service ResourceServer "Protected API Server"

beat reveal "System Overview":
  show $nodes stagger=50ms

beat redirect "Authorize & Consent":
  frame User ClientApp IdP zoom=1.15
  User -> ClientApp "click 'Login with IdP'"
  User <- ClientApp "302 Redirect to /authorize"
  User -> IdP "submit credentials & consent"
  User <- IdP "302 Redirect with ?code=AUTH_CODE"

beat exchange "Token Exchange & API Access":
  frame ClientApp IdP ResourceServer zoom=1.15
  ClientApp -> IdP "POST /token (code + secret)"
  ClientApp <- IdP "200 OK (access_token + id_token)"
  ClientApp -> ResourceServer "GET /userinfo (Bearer Token)"
  ClientApp <- ResourceServer "200 OK (User Profile)"
  glow ClientApp color=#10b981`,
  },
  {
    id: "multi-region-ha-cache",
    title: "Resilient Multi-Region High Availability & Cache-Aside",
    category: "Distributed Systems",
    description: "GeoDNS global routing, primary/failover regions, Redis master/replica cache-aside pattern, and Aurora global storage replication.",
    code: `scene theme=midnight
layout LR

gateway GeoDNS "Global Route53 / Anycast"
gateway RegionEast "US-East Gateway"
gateway RegionWest "US-West Gateway"
cache RedisPrimary "Redis Master"
cache RedisReplica "Redis Read Replica"
database AuroraGlobal "Aurora Multi-Region DB"

group eastTier "US-East (Primary)": RegionEast RedisPrimary
group westTier "US-West (Failover)": RegionWest RedisReplica

beat reveal "Global Infrastructure":
  show $nodes stagger=40ms

beat readCache "Cache-Aside Read Flow":
  frame GeoDNS eastTier AuroraGlobal zoom=1.12
  GeoDNS -> RegionEast "route nearest user" -> RedisPrimary "GET item:101"
  RegionEast <- RedisPrimary "cache miss"
  RegionEast -> AuroraGlobal "SELECT FROM db"
  RegionEast -> RedisPrimary "SET item:101 (TTL 60s)"
  GeoDNS <- RegionEast "200 OK (Payload)"

beat replication "Global Storage Replication":
  frame RedisPrimary RedisReplica AuroraGlobal zoom=1.15
  RedisPrimary ~> RedisReplica "async sync" & AuroraGlobal ~> AuroraGlobal "storage replication"`,
  },
  {
    id: "decision-flowchart",
    title: "Quality Gate Decision Flowchart",
    category: "Workflows / Flowcharts",
    description: "Top-down pull request quality evaluation workflow with branch decision diamonds and fallback rejection states.",
    code: `scene theme=sketchy type=flowchart
layout TB

start PR "New Pull Request"
decision LintCheck "Lint & Typecheck Passed?"
decision TestCheck "All 142 Tests Passed?"
decision A11yCheck "Lighthouse 100/100 Score?"
step Merge "Merge into Main"
end Reject "Reject & Post PR Feedback"

beat reveal "Quality Gates":
  show $nodes stagger=50ms

beat evaluate "Validation Pipeline":
  PR -> LintCheck "run eslint & tsc"
  LintCheck -> TestCheck "yes"
  TestCheck -> A11yCheck "yes"
  A11yCheck -> Merge "yes (approved)"
  glow Merge color=#10b981

beat failure "Fallback Reject Path":
  LintCheck -> Reject "no (syntax error)"
  TestCheck -> Reject "no (broken tests)"`,
  },
];

export function handleValidateMarkdy(code: string, checkArchitecture = true): ToolResult {
  try {
    const ast = parse(code);
    const diagnostics = ast.diagnostics ?? [];
    const archViolations = checkArchitecture ? validateArchitecture(ast) : [];

    const lines: string[] = [];
    lines.push(`✅ Markdy Syntax Valid: ${Object.keys(ast.nodes).length} nodes, ${ast.edges.length} static edges, ${ast.beats.length} beats.`);

    if (diagnostics.length > 0) {
      lines.push("\n⚠️ Diagnostics & Suggestions:");
      for (const d of diagnostics) {
        lines.push(`- line ${d.line}: [${d.severity}] ${d.message}`);
      }
    }

    if (archViolations.length > 0) {
      lines.push("\n🛡️ Architecture Rule Violations:");
      for (const v of archViolations) {
        lines.push(`- [${v.severity.toUpperCase()}] ${v.ruleName} (line ${v.line ?? 1}): ${v.message}`);
      }
    }

    return {
      content: [{ type: "text", text: lines.join("\n") }],
    };
  } catch (error) {
    const report = diagnoseMarkdyCode(code, {
      checkArchitecture,
      transpileMermaid: (src) => transpileMermaidToMarkdy(src, "Imported Scene").code,
    });
    return {
      isError: true,
      content: [
        {
          type: "text",
          text: `❌ Parse Error: ${(error as Error).message}\n\nSuggested AI Healing Prompt:\n${report.repairPrompt}`,
        },
      ],
    };
  }
}

export function handleDiagnoseMarkdy(code: string, checkArchitecture = true): ToolResult {
  const report = diagnoseMarkdyCode(code, {
    checkArchitecture,
    transpileMermaid: (src) => transpileMermaidToMarkdy(src, "Imported Scene").code,
  });

  const lines: string[] = [];
  lines.push(report.summary);

  if (report.issues.length > 0) {
    const errors = report.issues.filter((i) => i.severity === "error");
    const warnings = report.issues.filter((i) => i.severity === "warning");

    if (errors.length > 0) {
      lines.push("\n### ❌ Syntax Errors & Typos:");
      for (const e of errors) {
        lines.push(`- **[${e.code}]** Line ${e.line}: ${e.message}`);
        if (e.snippet) lines.push(`  - *Problem:* \`${e.snippet}\``);
        if (e.suggestion) lines.push(`  - *Recommendation:* ${e.suggestion}`);
        if (e.didYouMean) lines.push(`  - *Did you mean:* \`${e.didYouMean}\`?`);
      }
    }

    if (warnings.length > 0) {
      lines.push("\n### ⚠️ Warnings & Governance:");
      for (const w of warnings) {
        lines.push(`- **[${w.code}]** Line ${w.line}: ${w.message}`);
        if (w.suggestion) lines.push(`  - *Recommendation:* ${w.suggestion}`);
      }
    }
  }

  if (report.repairedCode) {
    lines.push("\n### 🛠️ Proposed Auto-Repaired Code:");
    lines.push("```markdy");
    lines.push(report.repairedCode);
    lines.push("```");
  }

  lines.push("\n### 💡 AI Self-Healing Prompt for LLMs / Agents:");
  lines.push(report.repairPrompt);

  return {
    isError: !report.isValid,
    content: [{ type: "text", text: lines.join("\n") }],
  };
}

export function handleFixMarkdy(code: string): ToolResult {
  const result = repairMarkdyCode(code, {
    transpileMermaid: (src) => transpileMermaidToMarkdy(src, "Imported Scene").code,
  });

  const lines: string[] = [];
  if (result.isFixed) {
    lines.push(`✅ Markdy Code Repaired Successfully (${result.changes.length} change(s) applied):\n`);
    for (const c of result.changes) {
      lines.push(`- ${c}`);
    }
    lines.push("\n```markdy");
    lines.push(result.repairedCode);
    lines.push("```");
  } else {
    lines.push(`⚠️ Applied ${result.changes.length} automated repair(s), but additional manual corrections may be needed:\n`);
    for (const c of result.changes) {
      lines.push(`- ${c}`);
    }
    lines.push("\n```markdy");
    lines.push(result.repairedCode);
    lines.push("```");

    const diag = diagnoseMarkdyCode(result.repairedCode);
    if (!diag.isValid) {
      lines.push("\nRemaining issues to resolve:");
      for (const iss of diag.issues) {
        lines.push(`- Line ${iss.line}: ${iss.message}`);
      }
    }
  }

  return {
    content: [{ type: "text", text: lines.join("\n") }],
  };
}

export async function handleTranspileToMarkdy(
  source: string,
  format: "mermaid" | "docker-compose" | "k8s" | "terraform" | "drawio",
  title = "Imported Scene"
): Promise<ToolResult> {
  try {
    let markdyCode = "";

    switch (format) {
      case "mermaid":
        markdyCode = transpileMermaidToMarkdy(source, title).code;
        break;
      case "docker-compose":
        markdyCode = transpileDockerComposeToMarkdy(source, title);
        break;
      case "k8s":
        markdyCode = transpileKubernetesManifestsToMarkdy(source, title);
        break;
      case "terraform":
        markdyCode = transpileTerraformStateToMarkdy(source, title);
        break;
      case "drawio":
        markdyCode = (await transpileDrawioToMarkdy(source, title)).code;
        break;
      default:
        throw new Error(`Unsupported ingestion format: ${format}`);
    }

    // Verify transpiled output passes parser
    parse(markdyCode);

    return {
      content: [
        {
          type: "text",
          text: markdyCode,
        },
      ],
    };
  } catch (error) {
    return {
      isError: true,
      content: [{ type: "text", text: `Transpilation failed: ${(error as Error).message}` }],
    };
  }
}

export function handleExplainArchitecture(code: string): ToolResult {
  try {
    const ast = parse(code);
    const nodeCount = Object.keys(ast.nodes).length;
    const edgeCount = ast.edges.length;
    const groupCount = Object.keys(ast.groups).length;
    const beatsCount = ast.beats.length;

    const rolesSummary = new Map<string, number>();
    for (const n of Object.values(ast.nodes)) {
      rolesSummary.set(n.kind, (rolesSummary.get(n.kind) ?? 0) + 1);
    }

    const roleBreakdown = Array.from(rolesSummary.entries())
      .map(([k, count]) => `  - ${k}: ${count}`)
      .join("\n");

    const violations = validateArchitecture(ast);

    const explanation = [
      `### Architecture Overview: ${ast.meta.title || "Untitled Diagram"}`,
      `- **Layout:** ${ast.meta.direction || "LR"}`,
      `- **Theme:** ${ast.meta.theme || "paper"}`,
      `- **Components:** ${nodeCount} nodes across ${groupCount} groups`,
      `- **Interactions:** ${edgeCount} static connections, ${beatsCount} dynamic beats`,
      "",
      `#### Component Kinds:`,
      roleBreakdown,
      "",
      `#### Governance & Well-Architected Health:`,
      violations.length === 0
        ? "✅ No architectural violations detected across Well-Architected rule presets."
        : `⚠️ Detected ${violations.length} governance issue(s):\n` +
          violations.map((v) => `- [${v.ruleName}] ${v.message}`).join("\n"),
    ].join("\n");

    return {
      content: [{ type: "text", text: explanation }],
    };
  } catch (error) {
    return {
      isError: true,
      content: [{ type: "text", text: `Explain failed: ${(error as Error).message}` }],
    };
  }
}

export function handleGenerateMarkdyPrompt(userGoal: string): ToolResult {
  const prompt = [
    `You are an expert system architecture designer specializing in MarkdyScript syntax and DSL.`,
    `Goal: ${userGoal}`,
    ``,
    `### Instructions & Authoritative Reference:`,
    `1. Follow the canonical MarkdyScript specification hosted at: https://markdy.com/AGENT.md`,
    `2. Structure the diagram linearly in 4 distinct steps:`,
    `   - Step 1: Directives: \`scene theme=paper width=1280 height=720\` and \`layout LR\``,
    `   - Step 2: Semantic Nodes: \`<kind> <Id> ["Human Label"]\` (e.g., \`browser Client "Shopper"\`, \`gateway Gateway "API Gateway"\`, \`service OrderService\`, \`database OrdersDB\`)`,
    `   - Step 3: Groups (optional): \`group <id> "<Label>": <Node1> <Node2>\``,
    `   - Step 4: Storyboard Beats: \`beat <id> "<Caption>":\` containing indented flows and cues.`,
    `3. Flow Operators & Cycle Safety:`,
    `   - Use \`->\` for forward requests/calls.`,
    `   - Use \`<-\` for responses/returns (prevents cyclical layout overlap!). Never use \`->\` for return paths.`,
    `   - Use \`~>\` for asynchronous events and pub-sub messaging.`,
    `4. Visual Cues: Use canonical cues: \`show $nodes\`, \`hide\`, \`frame <targets> zoom=1.15\`, \`glow <targets> color=#hex\`, \`focus\`, and \`&\` for parallel execution.`,
    `5. Output self-contained, valid MarkdyScript only.`,
  ].join("\n");

  return {
    content: [{ type: "text", text: prompt }],
  };
}

export function handleGetArchitectureCatalog(filterCategory?: string): ToolResult {
  const filtered = filterCategory
    ? ARCHITECTURE_TEMPLATES.filter((t) =>
        t.category.toLowerCase().includes(filterCategory.toLowerCase()) ||
        t.id.toLowerCase().includes(filterCategory.toLowerCase())
      )
    : ARCHITECTURE_TEMPLATES;

  const text = [
    `### Markdy Architecture Templates Catalog (${filtered.length} templates)`,
    "",
    ...filtered.map((t) =>
      [
        `#### ${t.title} (\`${t.id}\`)`,
        `- **Category:** ${t.category}`,
        `- **Description:** ${t.description}`,
        "```markdy",
        t.code,
        "```",
        "",
      ].join("\n")
    ),
  ].join("\n");

  return {
    content: [{ type: "text", text }],
  };
}

export function handleIntelliCode(code: string, line?: number, column?: number): ToolResult {
  const lines = code.split(/\r?\n/);
  const targetLine = line !== undefined ? line : Math.max(0, lines.length - 1);
  const targetCol = column !== undefined ? column : (lines[targetLine]?.length ?? 0);

  const completions = getIntelliCodeCompletions(code, targetLine, targetCol);
  const nextLinePrediction = predictNextLineSuggestion(code, targetLine);
  const archRecommendations = getArchitectureSuggestions(code);

  const output = {
    cursor: { line: targetLine, column: targetCol },
    completionsCount: completions.length,
    topCompletions: completions.slice(0, 20).map((c) => ({
      label: c.label,
      insertText: c.insertText,
      kind: c.kind,
      detail: c.detail,
      documentation: c.documentation,
    })),
    nextLinePrediction: nextLinePrediction
      ? {
          suggestedText: nextLinePrediction.text,
          description: nextLinePrediction.description,
          type: nextLinePrediction.type,
        }
      : null,
    architectureRecommendations: archRecommendations.map((r) => ({
      id: r.id,
      title: r.title,
      description: r.desc,
      category: r.category,
      actionSnippet: r.snippet,
    })),
  };

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(output, null, 2),
      },
    ],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// MCP Resource Handlers
// ─────────────────────────────────────────────────────────────────────────────

export function handleReadResource(uri: string): ResourceResult {
  switch (uri) {
    case "markdy://spec/agent-reference":
      return {
        contents: [
          {
            uri,
            mimeType: "text/markdown",
            text: `# MarkdyScript Canonical Specification Summary\n\nCanonical URL: https://markdy.com/AGENT.md\n\nCore Mental Model: Directives -> Nodes -> Groups -> Beats.\nCycle Safety: Always use <- for responses back to callers to prevent layout rank cycles.`,
          },
        ],
      };

    case "markdy://templates/catalog":
      return {
        contents: [
          {
            uri,
            mimeType: "application/json",
            text: JSON.stringify(ARCHITECTURE_TEMPLATES, null, 2),
          },
        ],
      };

    case "markdy://governance/rules":
      return {
        contents: [
          {
            uri,
            mimeType: "application/json",
            text: JSON.stringify(ARCH_RULE_PRESETS, null, 2),
          },
        ],
      };

    case "markdy://spec/grammar-rules":
      return {
        contents: [
          {
            uri,
            mimeType: "text/markdown",
            text: `# MarkdyScript Grammar & Diagnostic Rules

### 1. The 4-Step Mental Model
1. **Directives**: \`scene theme=paper width=1280 height=720\` and \`layout LR\` (or TB).
2. **Nodes**: \`<kind> <Id> ["Human Label"]\` (e.g. \`browser Client "Shopper"\`, \`gateway GW "API Gateway"\`, \`service Orders\`, \`database DB\`).
3. **Groups**: \`group <id> "<Label>": Node1 Node2\`
4. **Beats**: \`beat <id> "<Caption>":\` containing indented flow lines and cues.

### 2. Common Syntax Errors & Corrections
- **Keyword typos**: \`scen\` -> \`scene\`, \`layput\` -> \`layout\`, \`groop\` -> \`group\`, \`bea\` -> \`beat\`.
- **Node kind typos**: \`servce\` -> \`service\`, \`databse\` -> \`database\`, \`gateawy\` -> \`gateway\`, \`cach\` -> \`cache\`.
- **Missing colons**: Always terminate \`beat <id> ["Caption"]:\` and \`group <id> ["Label"]:\` with a colon.
- **Unquoted strings**: Labels containing spaces MUST be wrapped in double quotes (\`"...\`\`).
- **Cycle safety**: NEVER use \`->\` for response or return paths. Use \`<-\` for return calls to prevent cycle overlap rank collapse.
- **Cue placement**: Visual cues (\`show $nodes\`, \`glow\`, \`frame\`, \`focus\`) and flows must reside INSIDE an indented beat block.`,
          },
        ],
      };

    default:
      throw new Error(`Resource not found: ${uri}`);
  }
}

/**
 * packages/mcp-server/src/index.ts
 * MCP Server for Markdy Diagram Engine.
 * Supports Tools, Resources, and Prompts for Claude Desktop, Cursor, Antigravity, and autonomous agents.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
  type CallToolResult,
  type ListResourcesResult,
  type ReadResourceResult,
  type ListPromptsResult,
  type GetPromptResult,
} from "@modelcontextprotocol/sdk/types.js";
import {
  handleValidateMarkdy,
  handleDiagnoseMarkdy,
  handleFixMarkdy,
  handleTranspileToMarkdy,
  handleExplainArchitecture,
  handleGenerateMarkdyPrompt,
  handleGetArchitectureCatalog,
  handleIntelliCode,
  handleReadResource,
} from "./tools.js";

export {
  handleValidateMarkdy,
  handleDiagnoseMarkdy,
  handleFixMarkdy,
  handleTranspileToMarkdy,
  handleExplainArchitecture,
  handleGenerateMarkdyPrompt,
  handleGetArchitectureCatalog,
  handleIntelliCode,
  handleReadResource,
} from "./tools.js";

export const MCP_SERVER_VERSION = "1.0.30";

export function createMarkdyMcpServer(): Server {
  const server = new Server(
    {
      name: "markdy-mcp-server",
      version: MCP_SERVER_VERSION,
    },
    {
      capabilities: {
        tools: {},
        resources: {},
        prompts: {},
      },
    }
  );

  // ───────────────────────────────────────────────────────────────────────────
  // Tools Handlers
  // ───────────────────────────────────────────────────────────────────────────

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: "validate_markdy_code",
          description: "Validates MarkdyScript diagram syntax, detects architectural rule violations, and outputs diagnostic suggestions with AI healing prompts.",
          inputSchema: {
            type: "object",
            properties: {
              code: {
                type: "string",
                description: "The complete MarkdyScript (.markdy) diagram code starting with 'scene'.",
              },
              checkArchitecture: {
                type: "boolean",
                description: "Whether to run Well-Architected governance rule checks (e.g. layer boundaries, cycle detection, gateway checks). Default: true.",
              },
            },
            required: ["code"],
          },
        },
        {
          name: "diagnose_markdy_syntax",
          description: "Deep diagnostic tool that analyzes MarkdyScript diagram syntax, detects typos in keywords/node kinds/operators/nodes, identifies flow cycle overlaps, unquoted strings, and provides 'Did you mean?' suggestions with auto-repaired code.",
          inputSchema: {
            type: "object",
            properties: {
              code: {
                type: "string",
                description: "The MarkdyScript (.markdy) diagram code to inspect.",
              },
              checkArchitecture: {
                type: "boolean",
                description: "Whether to include Well-Architected governance rules in the report. Default: true.",
              },
            },
            required: ["code"],
          },
        },
        {
          name: "fix_markdy_code",
          description: "Automatically repairs common MarkdyScript syntax errors, typos, missing colons, invalid flow operators, unquoted strings, cycle return edges, and wraps top-level bare cues into a valid scene.",
          inputSchema: {
            type: "object",
            properties: {
              code: {
                type: "string",
                description: "The broken or draft MarkdyScript diagram code to automatically repair.",
              },
            },
            required: ["code"],
          },
        },
        {
          name: "transpile_to_markdy",
          description: "Converts external infrastructure or diagram code (Mermaid, Docker Compose, Kubernetes manifests, Terraform state, or Draw.io XML) into animated MarkdyScript scenes.",
          inputSchema: {
            type: "object",
            properties: {
              source: {
                type: "string",
                description: "The source code or markup content to transpile into MarkdyScript.",
              },
              format: {
                type: "string",
                enum: ["mermaid", "docker-compose", "k8s", "terraform", "drawio"],
                description: "The source format to transpile from. Must be exactly one of: 'mermaid', 'docker-compose', 'k8s', 'terraform', 'drawio'.",
              },
              title: {
                type: "string",
                description: "Optional human-readable title for the generated scene header.",
              },
            },
            required: ["source", "format"],
          },
        },
        {
          name: "explain_architecture",
          description: "Analyzes a MarkdyScript AST to output structural topology summaries, component role counts, and governance health metrics.",
          inputSchema: {
            type: "object",
            properties: {
              code: {
                type: "string",
                description: "The MarkdyScript diagram code to inspect.",
              },
            },
            required: ["code"],
          },
        },
        {
          name: "generate_markdy_prompt",
          description: "Generates optimal LLM system prompts and grammar constraints for building high-quality, hallucination-resistant Markdy architecture animations.",
          inputSchema: {
            type: "object",
            properties: {
              userGoal: {
                type: "string",
                description: "The architecture, workflow, or system flow description the user wants to visualize.",
              },
            },
            required: ["userGoal"],
          },
        },
        {
          name: "get_architecture_catalog",
          description: "Returns the catalog of production-grade golden architecture templates (Microservices, RAG, Kafka, Kubernetes Ingress, GitOps CI/CD, OAuth2, HA Multi-Region, Flowcharts) with full runnable MarkdyScript code.",
          inputSchema: {
            type: "object",
            properties: {
              filterCategory: {
                type: "string",
                description: "Optional filter string (e.g. 'Cloud', 'AI', 'Messaging', 'Security', 'DevOps').",
              },
            },
          },
        },
        {
          name: "get_markdy_intellicode",
          description: "Provides zero-dependency intelligent code completion, predictive ghost-text next-line suggestions, and Well-Architected proactive recommendations for MarkdyScript diagrams.",
          inputSchema: {
            type: "object",
            properties: {
              code: {
                type: "string",
                description: "The MarkdyScript diagram code.",
              },
              line: {
                type: "number",
                description: "Optional 0-indexed line number where the cursor is positioned.",
              },
              column: {
                type: "number",
                description: "Optional 0-indexed column character where the cursor is positioned.",
              },
            },
            required: ["code"],
          },
        },
      ],
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request): Promise<CallToolResult> => {
    const { name, arguments: args } = request.params;
    const safeArgs = (args || {}) as Record<string, unknown>;

    switch (name) {
      case "validate_markdy_code":
        return handleValidateMarkdy(
          String(safeArgs.code ?? ""),
          safeArgs.checkArchitecture !== false
        );

      case "diagnose_markdy_syntax":
        return handleDiagnoseMarkdy(
          String(safeArgs.code ?? ""),
          safeArgs.checkArchitecture !== false
        );

      case "fix_markdy_code":
        return handleFixMarkdy(String(safeArgs.code ?? ""));

      case "transpile_to_markdy":
        return await handleTranspileToMarkdy(
          String(safeArgs.source ?? ""),
          safeArgs.format as "mermaid" | "docker-compose" | "k8s" | "terraform" | "drawio",
          safeArgs.title ? String(safeArgs.title) : undefined
        );

      case "explain_architecture":
        return handleExplainArchitecture(String(safeArgs.code ?? ""));

      case "generate_markdy_prompt":
        return handleGenerateMarkdyPrompt(String(safeArgs.userGoal ?? ""));

      case "get_architecture_catalog":
        return handleGetArchitectureCatalog(safeArgs.filterCategory ? String(safeArgs.filterCategory) : undefined);

      case "get_markdy_intellicode":
        return handleIntelliCode(
          String(safeArgs.code ?? ""),
          typeof safeArgs.line === "number" ? safeArgs.line : undefined,
          typeof safeArgs.column === "number" ? safeArgs.column : undefined
        );

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Resources Handlers
  // ───────────────────────────────────────────────────────────────────────────

  server.setRequestHandler(ListResourcesRequestSchema, async (): Promise<ListResourcesResult> => {
    return {
      resources: [
        {
          uri: "markdy://spec/agent-reference",
          name: "MarkdyScript AI Agent Specification",
          description: "Canonical reference for MarkdyScript syntax, closed node vocabularies, and cycle-safety rules.",
          mimeType: "text/markdown",
        },
        {
          uri: "markdy://spec/grammar-rules",
          name: "MarkdyScript Grammar & Diagnostic Rules",
          description: "Grammar conventions, typo resolution guides, and cycle-safe routing rules.",
          mimeType: "text/markdown",
        },
        {
          uri: "markdy://templates/catalog",
          name: "Markdy Architecture Templates Catalog",
          description: "JSON catalog of curated golden architecture templates.",
          mimeType: "application/json",
        },
        {
          uri: "markdy://governance/rules",
          name: "Well-Architected Governance Rules",
          description: "Lint presets and architecture rules for validating cloud architectures.",
          mimeType: "application/json",
        },
      ],
    };
  });

  server.setRequestHandler(ReadResourceRequestSchema, async (request): Promise<ReadResourceResult> => {
    const { uri } = request.params;
    return handleReadResource(uri);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Prompts Handlers
  // ───────────────────────────────────────────────────────────────────────────

  server.setRequestHandler(ListPromptsRequestSchema, async (): Promise<ListPromptsResult> => {
    return {
      prompts: [
        {
          name: "create_architecture_diagram",
          description: "Guided workflow to design an animated Markdy architecture diagram following the 4-step mental model.",
          arguments: [
            {
              name: "userGoal",
              description: "The system or architecture to visualize.",
              required: true,
            },
            {
              name: "theme",
              description: "Preferred visual theme (paper, editorial, midnight, blueprint, graphite, nebula, sketchy, terminal, doodle).",
              required: false,
            },
            {
              name: "layout",
              description: "Layout direction (LR, TB, RL, BT).",
              required: false,
            },
          ],
        },
        {
          name: "debug_markdy_syntax",
          description: "Diagnose, troubleshoot, and heal broken MarkdyScript syntax, typos, undefined node references, or flow cycles.",
          arguments: [
            {
              name: "code",
              description: "The broken or erroneous MarkdyScript code to diagnose and repair.",
              required: true,
            },
          ],
        },
        {
          name: "audit_architecture",
          description: "Review a MarkdyScript diagram for Well-Architected governance, cycle overlap, and layer violations.",
          arguments: [
            {
              name: "code",
              description: "The MarkdyScript code to audit.",
              required: true,
            },
          ],
        },
        {
          name: "transpile_architecture",
          description: "Migrate existing Mermaid, Docker Compose, Kubernetes, or Terraform configurations into animated MarkdyScript.",
          arguments: [
            {
              name: "source",
              description: "The source code to convert.",
              required: true,
            },
            {
              name: "format",
              description: "Source format (mermaid, docker-compose, k8s, terraform, drawio).",
              required: true,
            },
          ],
        },
      ],
    };
  });

  server.setRequestHandler(GetPromptRequestSchema, async (request): Promise<GetPromptResult> => {
    const { name, arguments: args } = request.params;
    const safeArgs = (args || {}) as Record<string, string>;

    switch (name) {
      case "create_architecture_diagram": {
        const theme = safeArgs.theme || "paper";
        const layout = safeArgs.layout || "LR";
        return {
          description: `Create an animated Markdy architecture diagram for: ${safeArgs.userGoal}`,
          messages: [
            {
              role: "user",
              content: {
                type: "text",
                text: `Design an animated Markdy architecture diagram for: ${safeArgs.userGoal}\n\nConfiguration:\n- Theme: ${theme}\n- Layout: ${layout}\n\nFollow the canonical 4-step Markdy mental model:\n1. Directives (scene theme=${theme} layout=${layout})\n2. Node declarations (<kind> <Id> ["Human Label"])\n3. Groups (group <id> "<Label>": ...)\n4. Animated Storyboard beats with cycle-safe routing (use '<-' for return calls).`,
              },
            },
          ],
        };
      }

      case "debug_markdy_syntax": {
        return {
          description: "Diagnose and heal MarkdyScript syntax errors and typos",
          messages: [
            {
              role: "user",
              content: {
                type: "text",
                text: `Please diagnose and repair the following MarkdyScript code. Check for keyword typos, invalid node kinds, unquoted strings, missing colons, undefined node references, and flow cycles:\n\n\`\`\`markdy\n${safeArgs.code}\n\`\`\``,
              },
            },
          ],
        };
      }

      case "audit_architecture": {
        return {
          description: "Audit Markdy diagram against Well-Architected rules",
          messages: [
            {
              role: "user",
              content: {
                type: "text",
                text: `Please validate and audit the following MarkdyScript diagram for syntax integrity, cycle overlap, and Well-Architected rules:\n\n\`\`\`markdy\n${safeArgs.code}\n\`\`\``,
              },
            },
          ],
        };
      }

      case "transpile_architecture": {
        return {
          description: `Transpile ${safeArgs.format} to MarkdyScript`,
          messages: [
            {
              role: "user",
              content: {
                type: "text",
                text: `Please convert the following ${safeArgs.format} configuration into an animated Markdy diagram:\n\n\`\`\`\n${safeArgs.source}\n\`\`\``,
              },
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown prompt: ${name}`);
    }
  });

  return server;
}

export async function startMcpServer(): Promise<void> {
  const server = createMarkdyMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

const isDirectExecution =
  typeof process !== "undefined" &&
  Boolean(process.argv[1]) &&
  (process.argv[1].endsWith("index.js") ||
    process.argv[1].endsWith("index.mjs") ||
    process.argv[1].endsWith("markdy-mcp") ||
    process.argv[1].endsWith("markdy-mcp.js") ||
    process.argv[1].endsWith("markdy-mcp.mjs") ||
    process.argv[1].includes("mcp-server"));

if (isDirectExecution) {
  startMcpServer().catch((err) => {
    console.error("Fatal MCP Server Error:", err);
    process.exit(1);
  });
}

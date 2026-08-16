/**
 * packages/mcp-server/src/index.ts
 * MCP Server for Markdy Diagram Engine.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type CallToolResult,
} from "@modelcontextprotocol/sdk/types.js";
import {
  handleValidateMarkdy,
  handleTranspileToMarkdy,
  handleExplainArchitecture,
  handleGenerateMarkdyPrompt,
} from "./tools.js";

export {
  handleValidateMarkdy,
  handleTranspileToMarkdy,
  handleExplainArchitecture,
  handleGenerateMarkdyPrompt,
} from "./tools.js";

export function createMarkdyMcpServer(): Server {
  const server = new Server(
    {
      name: "markdy-mcp-server",
      version: "0.8.20",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: "validate_markdy_code",
          description: "Validates MarkdyScript syntax, detects architectural rule violations, and outputs diagnostics and healing suggestions.",
          inputSchema: {
            type: "object",
            properties: {
              code: { type: "string", description: "The MarkdyScript diagram code to validate." },
              checkArchitecture: { type: "boolean", description: "Whether to run Well-Architected governance rule checks." },
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
              source: { type: "string", description: "The source code or content to transpile." },
              format: {
                 type: "string",
                 enum: ["mermaid", "docker-compose", "k8s", "terraform", "drawio"],
                 description: "The source format.",
               },
              title: { type: "string", description: "Optional title for the resulting scene." },
            },
            required: ["source", "format"],
          },
        },
        {
          name: "explain_architecture",
          description: "Analyzes a MarkdyScript AST and generates a structured summary of components, topology, and governance health.",
          inputSchema: {
            type: "object",
            properties: {
              code: { type: "string", description: "The MarkdyScript code to analyze." },
            },
            required: ["code"],
          },
        },
        {
          name: "generate_markdy_prompt",
          description: "Generates optimal LLM system prompts and grammar constraints for building high-quality Markdy architecture animations.",
          inputSchema: {
            type: "object",
            properties: {
              userGoal: { type: "string", description: "The architecture or flow description the user wants to visualize." },
            },
            required: ["userGoal"],
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

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  });

  return server;
}

export async function startMcpServer(): Promise<void> {
  const server = createMarkdyMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

if (process.argv[1] && process.argv[1].endsWith("index.js")) {
  startMcpServer().catch((err) => {
    console.error("Fatal MCP Server Error:", err);
    process.exit(1);
  });
}

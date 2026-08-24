import { describe, it, expect } from "vitest";
import {
  handleValidateMarkdy,
  handleTranspileToMarkdy,
  handleExplainArchitecture,
  handleGenerateMarkdyPrompt,
  handleGetArchitectureCatalog,
  handleReadResource,
} from "../src/tools.js";
import { createMarkdyMcpServer, MCP_SERVER_VERSION } from "../src/index.js";

describe("@markdy/mcp-server: MCP Tool Handlers", () => {
  it("validates valid Markdy code and reports stats", () => {
    const code = `
      scene theme=paper
      layout LR
      service API
      database DB
      beat main:
        API -> DB "query"
    `;
    const result = handleValidateMarkdy(code);
    expect(result.isError).toBeFalsy();
    expect(result.content[0].text).toContain("Markdy Syntax Valid");
  });

  it("detects architectural violations and returns healing advice on parse failure", () => {
    const broken = `??? invalid syntax`;
    const result = handleValidateMarkdy(broken);
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("Suggested AI Healing Prompt");
  });

  it("transpiles external sources to valid Markdy code across all formats", async () => {
    const mmd = `
      flowchart LR
        A[Client] --> B[Server]
    `;
    const mmdResult = await handleTranspileToMarkdy(mmd, "mermaid", "Imported Flow");
    expect(mmdResult.isError).toBeFalsy();
    expect(mmdResult.content[0].text).toContain("scene \"Imported Flow\"");

    const drawioXml = `<mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/><mxCell id="c" value="Client" vertex="1" parent="1"/><mxCell id="s" value="Server" vertex="1" parent="1"/><mxCell id="e" source="c" target="s" edge="1" parent="1"/></root></mxGraphModel>`;
    const drawioResult = await handleTranspileToMarkdy(drawioXml, "drawio", "Imported Drawio");
    expect(drawioResult.isError).toBeFalsy();
    expect(drawioResult.content[0].text).toContain("scene \"Imported Drawio\"");
  });

  it("explains architecture and components", () => {
    const code = `
      scene theme=paper
      layout LR
      browser UI
      gateway GW
      service App
      database DB
      group g1 "Core": App DB
      beat main:
        UI -> GW -> App -> DB
    `;
    const result = handleExplainArchitecture(code);
    expect(result.isError).toBeFalsy();
    expect(result.content[0].text).toContain("Architecture Overview");
    expect(result.content[0].text).toContain("- **Components:** 4 nodes across 1 groups");
  });

  it("generates structured LLM guidance prompts", () => {
    const result = handleGenerateMarkdyPrompt("A distributed payment processing system");
    expect(result.content[0].text).toContain("MarkdyScript syntax");
    expect(result.content[0].text).toContain("https://markdy.com/AGENT.md");
    expect(result.content[0].text).toContain("payment processing");
  });

  it("returns curated architecture templates from catalog", () => {
    const all = handleGetArchitectureCatalog();
    expect(all.content[0].text).toContain("Markdy Architecture Templates Catalog");
    expect(all.content[0].text).toContain("microservices-db");
    expect(all.content[0].text).toContain("ai-rag-pipeline");

    const filtered = handleGetArchitectureCatalog("AI");
    expect(filtered.content[0].text).toContain("ai-rag-pipeline");
  });

  it("handles reading MCP resources", () => {
    const spec = handleReadResource("markdy://spec/agent-reference");
    expect(spec.contents[0].text).toContain("https://markdy.com/AGENT.md");

    const templates = handleReadResource("markdy://templates/catalog");
    expect(templates.contents[0].mimeType).toBe("application/json");

    const rules = handleReadResource("markdy://governance/rules");
    expect(rules.contents[0].mimeType).toBe("application/json");

    expect(() => handleReadResource("markdy://invalid/uri")).toThrow("Resource not found");
  });

  it("creates an MCP server with tools, resources, and prompts", () => {
    const server = createMarkdyMcpServer();
    expect(server).toBeDefined();
    expect(MCP_SERVER_VERSION).toBe("1.0.25");
  });
});

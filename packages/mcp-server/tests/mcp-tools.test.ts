import { describe, it, expect } from "vitest";
import {
  handleValidateMarkdy,
  handleTranspileToMarkdy,
  handleExplainArchitecture,
  handleGenerateMarkdyPrompt,
} from "../src/tools.js";

describe("@markdy/mcp-server: MCP Tool Handlers", () => {
  it("validates valid Markdy code and reports stats", () => {
    const code = `
      scene "Valid App" theme=paper
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

  it("transpiles external sources to valid Markdy code", () => {
    const mmd = `
      flowchart LR
        A[Client] --> B[Server]
    `;
    const result = handleTranspileToMarkdy(mmd, "mermaid", "Imported Flow");
    expect(result.isError).toBeFalsy();
    expect(result.content[0].text).toContain("scene \"Imported Flow\"");
  });

  it("explains architecture and components", () => {
    const code = `
      scene "Architecture" theme=paper
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
    expect(result.content[0].text).toContain("MarkdyScript 0.8+ syntax");
    expect(result.content[0].text).toContain("payment processing");
  });
});

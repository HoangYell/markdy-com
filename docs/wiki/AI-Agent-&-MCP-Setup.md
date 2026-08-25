# AI Coding Assistants & MCP Server Guide

Configure Claude Desktop, Cursor Composer, Antigravity, and AI agents to generate, validate, and repair Markdy diagrams.

---

<p align="center">
  <img src="https://raw.githubusercontent.com/HoangYell/markdy-com/main/docs/images/markdy-ai-agent-workflow.webp" alt="AI Agent Workflow" width="100%" />
</p>

## ⚡ Quick MCP Setup

Add `@markdy/mcp-server` to your MCP configuration file:

### 1. Claude Desktop
Add to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "markdy": {
      "command": "npx",
      "args": ["-y", "@markdy/mcp-server"]
    }
  }
}
```

### 2. Cursor (Composer / Agent)
In Cursor Settings $\rightarrow$ Features $\rightarrow$ MCP Servers $\rightarrow$ Add New MCP Server:
- **Name**: `markdy`
- **Type**: `command`
- **Command**: `npx -y @markdy/mcp-server`

---

## 🛠️ Available MCP Tools

| Tool Name | Description |
|---|---|
| `validate_markdy_code` | Validates syntax and architectural governance rules (layer boundaries, cycle detection). |
| `diagnose_markdy_syntax` | Deep analysis with "Did you mean?" suggestions and auto-fix recommendations. |
| `fix_markdy_code` | Automatically repairs typos, missing colons, invalid node kinds, and unquoted strings. |
| `transpile_to_markdy` | Transpiles Mermaid, Draw.io, Docker Compose, Kubernetes, and Terraform into MarkdyScript. |
| `explain_architecture` | Analyzes a diagram AST and provides a structured architectural summary. |
| `get_architecture_catalog` | Returns curated architecture templates (Cache-Aside, PKCE Auth, Medallion, etc.). |
| `markdy_intellicode` | Returns smart completions and predictive next-line suggestions based on cursor position. |

---

## 🤖 Prompting LLMs Directly

When prompting ChatGPT, Claude, or GitHub Copilot without MCP, include the canonical specification link:

```text
Follow the canonical Markdy specification at https://markdy.com/AGENT.md and generate a complete .markdy scene for:
"A resilient URL shortener architecture with Client, Cloudflare CDN, API Gateway, Redis Cache-Aside, and PostgreSQL database with animated cache-hit and cache-miss beats."
```

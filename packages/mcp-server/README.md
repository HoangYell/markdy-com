# @markdy/mcp-server

Official **Model Context Protocol (MCP)** server for Markdy — the animated diagram-as-code DSL.

Equip Claude Desktop, Cursor, Google Antigravity, and autonomous AI agents with tools to parse, validate, transpile, explain, and craft animated Markdy architecture diagrams.

---

## 🛠️ Provided Tools

1. `validate_markdy_code`
   - Validates syntax and executes Well-Architected governance rules (layer boundaries, cycle detection, gateway checks).
   - Generates structured diagnostic hints and AI repair prompts.

2. `transpile_to_markdy`
   - Converts Mermaid, Docker Compose, Kubernetes manifests, or Terraform state into animated MarkdyScript scenes.

3. `explain_architecture`
   - Parses a MarkdyScript AST to output structural topology summaries, component role counts, and governance health.

4. `generate_markdy_prompt`
   - Generates optimal system prompt constraints and instructions for LLMs.

---

## 🚀 Configuration

### Claude Desktop (`claude_desktop_config.json`)

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

### Cursor (`.cursor/mcp.json`)

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

---

## License

MIT © [Hoang Yell](https://hoangyell.com)

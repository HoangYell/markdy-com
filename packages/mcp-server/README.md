# @markdy/mcp-server

> Official **Model Context Protocol (MCP)** server for Markdy — the animated diagram-as-code DSL.

Equip **Claude Desktop**, **Cursor**, **Google Antigravity**, **Windsurf**, and autonomous AI agents with tools to parse, validate, transpile, explain, and craft animated Markdy architecture diagrams.

<p align="center">
  <a href="https://markdy.com/agent/">
    <img src="https://raw.githubusercontent.com/HoangYell/markdy-com/main/website/public/images/markdy-ai-agent-workflow.webp" alt="Markdy AI Agent & MCP Integration" width="900" />
  </a>
</p>
<p align="center">
  <a href="https://markdy.com/playground/">
    <img src="https://raw.githubusercontent.com/HoangYell/markdy-com/main/website/public/images/scene-oauth-pkce-sequence.webp" alt="Markdy AI-Generated OAuth Sequence Preview" width="900" />
  </a>
</p>

---

## ⚡ Key Capabilities

| Capability | Description |
| :--- | :--- |
| **🛠️ Tools** | Syntax validation with AI self-healing diagnostics, multi-format transpilation (Mermaid, Docker Compose, Kubernetes, Terraform, Draw.io), topology breakdown, and template retrieval. |
| **📦 Resources** | On-demand access to the canonical specification (`markdy://spec/agent-reference`), Well-Architected governance rules (`markdy://governance/rules`), and curated architecture templates (`markdy://templates/catalog`). |
| **💬 Prompts** | Pre-engineered prompt workflows (`create_architecture_diagram`, `audit_architecture`, `transpile_architecture`) that guide agents through structured diagram design. |

---

## 🚀 Client Configuration

### 1. Claude Desktop (`claude_desktop_config.json`)

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

### 2. Cursor (`.cursor/mcp.json`)

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

### 3. Google Antigravity (`~/.gemini/antigravity/mcp_config.json`)

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

### 4. Windsurf (`~/.codeium/windsurf/mcp_config.json`)

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

### 5. Zed (`settings.json`)

```json
{
  "context_servers": {
    "markdy": {
      "command": {
        "path": "npx",
        "args": ["-y", "@markdy/mcp-server"]
      }
    }
  }
}
```

---

## 🛠️ Provided Tools

### 1. `validate_markdy_code`
Validates MarkdyScript syntax and verifies Well-Architected governance rules (layer boundaries, cycle detection, ingress gateway enforcement). Returns structured diagnostic suggestions and an AI healing prompt if parse errors occur.

#### Parameters
| Parameter | Type | Presence | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `code` | `string` | **Required** | *None* | The complete MarkdyScript diagram code starting with `scene`. |
| `checkArchitecture` | `boolean` | Optional | `true` | When `true`, runs Well-Architected governance lint rules. |

#### Example Request
```json
{
  "name": "validate_markdy_code",
  "arguments": {
    "code": "scene theme=paper layout=LR\nservice API\ndatabase DB\nbeat main:\n  API -> DB \"query\"\n  API <- DB \"200 OK\""
  }
}
```

---

### 2. `transpile_to_markdy`
Converts existing infrastructure definitions or diagrams into animated MarkdyScript scenes.

#### Parameters
| Parameter | Type | Presence | Allowed Values | Description |
| :--- | :--- | :--- | :--- | :--- |
| `source` | `string` | **Required** | *Raw code / markup* | Source code to transpile. |
| `format` | `string` | **Required** | `mermaid`, `docker-compose`, `k8s`, `terraform`, `drawio` | Format of the input source. |
| `title` | `string` | Optional | `"Imported Scene"` | Scene title rendered in the output diagram header. |

#### Example Request
```json
{
  "name": "transpile_to_markdy",
  "arguments": {
    "format": "docker-compose",
    "source": "version: '3'\nservices:\n  web:\n    image: nginx\n  api:\n    image: node-app",
    "title": "Container Stack"
  }
}
```

---

### 3. `explain_architecture`
Parses a MarkdyScript AST to output structural topology summaries, component role counts, and governance health metrics.

#### Parameters
| Parameter | Type | Presence | Description |
| :--- | :--- | :--- | :--- |
| `code` | `string` | **Required** | The MarkdyScript diagram code to inspect. |

---

### 4. `generate_markdy_prompt`
Generates optimal, hallucination-resistant LLM system prompts and grammar constraints tailored to a specific user goal.

#### Parameters
| Parameter | Type | Presence | Description |
| :--- | :--- | :--- | :--- |
| `userGoal` | `string` | **Required** | Description of the system or workflow to visualize. |

---

### 5. `get_architecture_catalog`
Returns production-grade golden architecture templates (Microservices, RAG, Kafka Event-Driven, K8s Ingress, GitOps CI/CD, OAuth2, HA Multi-Region, Flowcharts) with full runnable MarkdyScript source code.

#### Parameters
| Parameter | Type | Presence | Description |
| :--- | :--- | :--- | :--- |
| `filterCategory` | `string` | Optional | Filter string by category name (e.g. `'AI'`, `'Cloud'`, `'Security'`). |

---

## 📦 Provided Resources

AI agents can directly read these canonical context URIs via MCP:

| URI | MIME Type | Description |
| :--- | :--- | :--- |
| `markdy://spec/agent-reference` | `text/markdown` | Canonical MarkdyScript specification, node kinds, and cycle-prevention rules. |
| `markdy://templates/catalog` | `application/json` | Curated JSON catalog of all 8 golden architecture templates. |
| `markdy://governance/rules` | `application/json` | Well-Architected governance rules and lint presets. |

---

## 💬 Provided Prompts

| Prompt | Arguments | Purpose |
| :--- | :--- | :--- |
| `create_architecture_diagram` | `userGoal` (req), `theme` (opt), `layout` (opt) | Guided workflow to design an animated Markdy architecture diagram from scratch. |
| `audit_architecture` | `code` (req) | Audits a MarkdyScript diagram against Well-Architected governance and cycle-safety rules. |
| `transpile_architecture` | `source` (req), `format` (req) | Guides migration of legacy diagrams or infra into animated MarkdyScript. |

---

## 📖 Canonical References

- **Authoritative AI Agent Guide**: <https://markdy.com/AGENT.md>
- **Human Documentation**: <https://markdy.com/docs/>
- **Interactive Playground**: <https://markdy.com/playground/>
- **LLM Index**: <https://markdy.com/llms.txt>

---

## License

MIT © [Hoang Yell](https://hoangyell.com)

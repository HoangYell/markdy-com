# Welcome to the Markdy Wiki

<p align="center">
  <a href="https://markdy.com">
    <img src="https://raw.githubusercontent.com/HoangYell/markdy-com/main/docs/images/mascot/markdy-com.webp" width="320" alt="Markdy" />
  </a>
  <br>
  <strong>Open-source diagram-as-code DSL for animated architecture & system design explainers.</strong>
</p>

---

## ⚡ Quick Navigation Portal

- **[MarkdyScript Cheatsheet](MarkdyScript-Cheatsheet)** — Complete 1-page quick syntax reference.
- **[Mermaid Migration Guide](Mermaid-Migration-Guide)** — Side-by-side transpiler & visual comparison.
- **[AI Agent & MCP Setup](AI-Agent-&-MCP-Setup)** — 1-minute configuration for Cursor, Claude, Antigravity, and Copilot.
- **[Awesome Markdy Showcase](Awesome-Markdy-Showcase)** — Curated real-world architecture templates & patterns.
- **[FAQ & Troubleshooting](FAQ-&-Troubleshooting)** — Answers to common developer questions and performance tips.

---

## 🚀 Interactive Links

- ⚡ **[Live Studio Playground](https://markdy.com/playground/)** — Experiment with 30+ interactive scenes in your browser.
- 📖 **[Official Documentation](https://markdy.com/docs/)** — Full grammar specification, AST schema, and API guides.
- 🌟 **[17+ Layout Examples Gallery](https://markdy.com/examples/)** — Live gallery of systems, roadmaps, and security perimeters.
- 🤖 **[AI LLMs Context (llms-full.txt)](https://markdy.com/llms-full.txt)** — Canonical context file for AI assistants.

---

## 💡 What is Markdy?

Markdy is a diagram-as-code DSL built specifically for **animated architecture diagrams and system-design explainers**. Instead of drawing static boxes in visual design apps, you declare semantic nodes, groups, flows, and timed beats in plain text — Markdy compiles smooth 60fps Web Animations directly in the browser.

```markdy
scene "Cache-Aside Architecture" theme=paper
layout LR

browser Client
service ApiGateway
cache Redis
database Postgres

beat main "Query with cache-aside fallback":
  show $nodes stagger=60ms
  frame Client ApiGateway zoom=1.1
  Client -> ApiGateway "GET /items"
  ApiGateway -> Redis "check key"
  Redis ~> ApiGateway "cache miss"
  ApiGateway -> Postgres "SELECT query" -> Redis "warm cache"
  Client <- ApiGateway "200 OK"
```

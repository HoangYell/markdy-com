---
name: markdy-mcp-debug
description: >-
  Diagnose, troubleshoot, and heal MarkdyScript diagram syntax errors, typos, grammar mistakes, undefined nodes, and flow cycles using Markdy MCP server tools and self-healing recommendations.
---

# Markdy MCP Debug & Syntax Healing Skill

This skill equips AI agents and developers to diagnose, debug, and heal MarkdyScript (`.markdy`) diagram syntax errors, typos, grammar mistakes, undefined node references, and architectural flow cycles using the **Markdy MCP Server** tools.

---

## 🧭 The Canonical 4-Step Mental Model

Every valid MarkdyScript diagram is structured linearly in **4 distinct steps**:

```markdy
# Step 1: Directives (Canvas theme and layout orientation)
scene theme=paper
layout LR

# Step 2: Semantic Node Declarations (<kind> <Id> ["Human Label"])
browser WebApp "Web Application"
mobile MobileApp "Mobile Client"
gateway ApiGateway "Cloud Gateway"
service OrderService "Order Service"
database MainDB "PostgreSQL"
cache RedisCache "Redis Cluster"

# Step 3: Groups (Logical tier boundaries)
group clients "User Surfaces": WebApp MobileApp
group backend "Service Tier": ApiGateway OrderService
group dataTier "Data Tier": MainDB RedisCache

# Step 4: Storyboard Beats (Narrative steps with indented flows & cues)
beat reveal "System Overview":
  show $nodes stagger=40ms

beat checkout "Process Order":
  MobileApp -> ApiGateway "POST /checkout" -> OrderService "create_order"
  OrderService -> RedisCache "check inventory"
  OrderService -> MainDB "insert order"
  MobileApp <- ApiGateway "201 Created"
  glow MobileApp color=#10b981
```

---

## 🛠️ MCP Tools for Debugging & Healing

The Markdy MCP server exposes specialized tools for diagnostic inspection and automatic repair:

### 1. `diagnose_markdy_syntax`
Performs deep AST parsing, fuzzy typo matching (using Damerau-Levenshtein distance), undefined node resolution, and flow cycle detection.

**Input**:
```json
{
  "code": "scen theme=papr\nlayput LR\nservce API\ndatabse DB\nbeat main\n  API -> DB"
}
```

**Output**:
- Comprehensive error summary with line numbers and snippets.
- Precise `"Did you mean?"` suggestions for misspelled keywords, node kinds, or node IDs.
- Concrete rule explanations.
- Proposed auto-repaired MarkdyScript code.
- AI healing prompt formatted for LLMs.

### 2. `fix_markdy_code`
Automatically applies deterministic repairs to broken or draft MarkdyScript code:
- Corrects keyword typos (`scen` -> `scene`, `layput` -> `layout`, `groop` -> `group`, `bea` -> `beat`).
- Corrects node kind typos (`servce` -> `service`, `databse` -> `database`, `cach` -> `cache`, `gateawy` -> `gateway`).
- Fixes node reference typos in beats matching declared nodes (`OrderSvc` -> `OrderService`).
- Adds missing colons to beat and group headers (`beat checkout:`).
- Wraps unquoted multi-word string labels in double quotes (`service api "My API"`).
- Fixes invalid flow operators (`-->` -> `->`, `==>` -> `->`).
- Wraps bare top-level cues inside a default `beat main` block.

### 3. `validate_markdy_code`
Validates syntax and runs Well-Architected governance rules (layer boundaries, direct client-to-DB bypass detection, API gateway presence).

### 4. `transpile_to_markdy`
If the input is foreign diagram syntax (Mermaid, Docker Compose, Kubernetes manifests, Terraform state, or Draw.io XML), converts it into clean, animated MarkdyScript.

---

## ⚠️ Catalog of Common Syntax Errors & How to Fix Them

### 1. Typo in Directives or Keywords
* **Wrong**:
  ```markdy
  scen theme=papr
  layput LR
  ```
* **Why it fails**: `scen` and `layput` are unrecognized keywords; `papr` is an invalid theme.
* **Fix**:
  ```markdy
  scene theme=paper
  layout LR
  ```
  *(Supported themes: `paper`, `editorial`, `midnight`, `blueprint`, `graphite`, `nebula`, `sketchy`, `terminal`)*

---

### 2. Typo in Semantic Node Kinds
* **Wrong**:
  ```markdy
  servce Orders
  databse MainDB
  cach Redis
  gateawy Gateway
  ```
* **Why it fails**: Markdy uses semantic vocabularies for nodes.
* **Fix**:
  ```markdy
  service Orders
  database MainDB
  cache Redis
  gateway Gateway
  ```
  *(Supported kinds: `service`, `database`, `cache`, `gateway`, `browser`, `mobile`, `worker`, `cloud`, `network`, `storage`, `queue`, `cluster`, `pod`, `registry`, `auth`, `user`, `decision`, `start`, `end`, `step`)*

---

### 3. Unquoted String Labels Containing Spaces
* **Wrong**:
  ```markdy
  service Orders Order Processing Service
  database DB Primary PostgreSQL DB
  ```
* **Why it fails**: String labels containing spaces must be wrapped in double quotes `"..."`. Without quotes, the parser treats extra words as invalid syntax.
* **Fix**:
  ```markdy
  service Orders "Order Processing Service"
  database DB "Primary PostgreSQL DB"
  ```

---

### 4. Missing Colon on Beat / Group Headers
* **Wrong**:
  ```markdy
  group clients "User Tier" WebApp MobileApp
  beat authFlow "Authenticate User"
    WebApp -> ApiGateway "POST /login"
  ```
* **Why it fails**: Beat headers and group headers require a trailing colon `:`.
* **Fix**:
  ```markdy
  group clients "User Tier": WebApp MobileApp
  beat authFlow "Authenticate User":
    WebApp -> ApiGateway "POST /login"
  ```

---

### 5. Flow Cycle Overlap (Using `->` for Return/Response Edges)
* **Wrong**:
  ```markdy
  beat checkout "Process Order":
    MobileApp -> ApiGateway "POST /checkout"
    ApiGateway -> OrderService "create"
    OrderService -> ApiGateway "order_created"
    ApiGateway -> MobileApp "201 Created"
  ```
* **Why it fails**: In DAG-ranked layout, forward edges (`->`, `~>`, `--`) rank downstream nodes deeper. When a forward edge points backward to an ancestor, it creates a topological cycle that crushes nodes into overlapping columns!
* **Fix**: Use the response operator `<-` for all return calls:
  ```markdy
  beat checkout "Process Order":
    MobileApp -> ApiGateway "POST /checkout" -> OrderService "create"
    MobileApp <- ApiGateway "201 Created"
  ```

---

### 6. Action Cues Placed Outside Beat Blocks
* **Wrong**:
  ```markdy
  scene theme=paper
  layout LR
  service API
  database DB
  show $nodes
  frame API DB zoom=1.15
  API -> DB "query"
  ```
* **Why it fails**: Top-level statements are reserved for Directives, Nodes, and Groups. Animated cues (`show`, `hide`, `glow`, `focus`, `frame`) and flows must live inside an indented `beat <id>:` block.
* **Fix**:
  ```markdy
  scene theme=paper
  layout LR
  service API
  database DB

  beat main "System Execution":
    show $nodes
    frame API DB zoom=1.15
    API -> DB "query"
  ```

---

### 7. Undefined Node References in Flows or Cues
* **Wrong**:
  ```markdy
  service ApiGateway "API Gateway"
  service OrderService "Order Service"

  beat checkout "Checkout":
    ApiGateawy -> OrderSvc "submit"
  ```
* **Why it fails**: `ApiGateawy` and `OrderSvc` were never declared.
* **Fix**: Use exact node IDs matching declarations:
  ```markdy
  service ApiGateway "API Gateway"
  service OrderService "Order Service"

  beat checkout "Checkout":
    ApiGateway -> OrderService "submit"
  ```

---

## ⚡ Agent Self-Healing Workflow

When generating MarkdyScript code as an AI agent:

```
                  ┌──────────────────────────────┐
                  │ 1. Generate MarkdyScript     │
                  └──────────────┬───────────────┘
                                 │
                                 ▼
                  ┌──────────────────────────────┐
                  │ 2. Call diagnose_markdy_syntax
                  └──────────────┬───────────────┘
                                 │
                     ┌───────────┴───────────┐
                     │ Is report.isValid?    │
                     └─────┬───────────┬─────┘
                           │           │
                     Yes   │           │ No
                           ▼           ▼
             ┌──────────────────┐  ┌─────────────────────────────────┐
             │ Output clean code│  │ Call fix_markdy_code or apply   │
             │ to user          │  │ "Did you mean?" suggestions     │
             └──────────────────┘  └────────────────┬────────────────┘
                                                    │
                                                    ▼
                                   ┌─────────────────────────────────┐
                                   │ Re-validate with validate_markdy│
                                   └─────────────────────────────────┘
```

By following this workflow, your generated Markdy architecture diagrams will always render flawlessly, without layout cycles, missing elements, or runtime syntax crashes.

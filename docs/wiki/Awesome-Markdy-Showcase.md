# Awesome Markdy Architecture Templates

A curated catalog of production-grade architecture patterns, security boundaries, and data pipelines built with Markdy.

---

## ⚡ High-Throughput & Distributed Systems

### 1. Cache-Aside Pattern (Redis + PostgreSQL)
- **Engine**: `type=architecture` • `theme=paper`
- **Pattern**: Sub-2ms Redis cache lookup, cache-miss fallback, asynchronous cache warming.
- **[Open in Live Studio ↗](https://markdy.com/playground/)**

### 2. Distributed 2PC (Two-Phase Commit) Consensus
- **Engine**: `type=state` • `theme=paper`
- **Pattern**: Prepare, Commit, Abort coordinator states across distributed partitions.
- **[Open in Live Studio ↗](https://markdy.com/playground/)**

### 3. Consistent Hash Ring Virtual Nodes
- **Engine**: `type=tree` • `theme=editorial`
- **Pattern**: `O(k/N)` minimal data movement across hash ring partitions.
- **[Open in Live Studio ↗](https://markdy.com/playground/)**

---

## 🔐 Identity & Zero-Trust Security

### 4. OAuth 2.0 PKCE Handshake
- **Engine**: `type=sequence` • `theme=paper`
- **Pattern**: SHA256 code challenge generation, token exchange, and API bearer token verification.
- **[Open in Live Studio ↗](https://markdy.com/playground/)**

### 5. Zero-Trust Kubernetes Enclaves
- **Engine**: `type=nested` • `theme=blueprint`
- **Pattern**: Concentric perimeter defense, DMZ ingress, and mTLS secret store access.
- **[Open in Live Studio ↗](https://markdy.com/playground/)**

---

## 📊 Data Pipelines & Roadmaps

### 6. Lakehouse Medallion Data Architecture
- **Engine**: `type=medallion` • `theme=editorial`
- **Pattern**: Streaming Bronze (Raw) $\rightarrow$ Silver (Cleaned) $\rightarrow$ Gold (Aggregated) dbt transformations.
- **[Open in Live Studio ↗](https://markdy.com/playground/)**

### 7. Zero-Downtime Migration Roadmap
- **Engine**: `type=gantt` • `theme=paper`
- **Pattern**: Multi-phase database migration with dual-writes and traffic cutover.
- **[Open in Live Studio ↗](https://markdy.com/playground/)**

---

## 🤝 Contributing Your Templates

Have you created a great Markdy diagram for your project or blog? Share it in our [GitHub Discussions Show & Tell](https://github.com/HoangYell/markdy-com/discussions/categories/show-and-tell)!

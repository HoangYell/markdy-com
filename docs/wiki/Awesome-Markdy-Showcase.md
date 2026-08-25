# Awesome Markdy Architecture Templates

A curated catalog of production-grade architecture patterns, security boundaries, and data pipelines built with Markdy.

---

## ⚡ High-Throughput & Distributed Systems

### 1. Cache-Aside Pattern (Redis + PostgreSQL)
<p align="center">
  <img src="https://raw.githubusercontent.com/HoangYell/markdy-com/main/docs/images/scene-url-shortener.webp" alt="Cache-Aside Pattern" width="100%" />
</p>

- **Engine**: `type=architecture` • `theme=paper`
- **Pattern**: Sub-2ms Redis cache lookup, cache-miss fallback, asynchronous cache warming.
- **[Open in Live Studio ↗](https://markdy.com/playground/)**

### 2. Twitter Timeline Fan-Out Architecture
<p align="center">
  <img src="https://raw.githubusercontent.com/HoangYell/markdy-com/main/docs/images/scene-twitter-timeline.webp" alt="Twitter Timeline Fan-Out" width="100%" />
</p>

- **Engine**: `type=architecture` • `theme=paper`
- **Pattern**: Asynchronous fan-out on write, Kafka stream ingestion, Redis cluster home timeline hydration.
- **[Open in Live Studio ↗](https://markdy.com/playground/)**

---

## 🔐 Identity & Zero-Trust Security

### 3. OAuth 2.0 & OIDC Authorization Code Flow
<p align="center">
  <img src="https://raw.githubusercontent.com/HoangYell/markdy-com/main/docs/images/scene-oauth-oidc-flow.webp" alt="OAuth 2.0 & OIDC Flow" width="100%" />
</p>

- **Engine**: `type=sequence` • `theme=paper`
- **Pattern**: SHA256 PKCE code challenge verification, token exchange, and authenticated user profile retrieval.
- **[Open in Live Studio ↗](https://markdy.com/playground/)**

### 4. Zero-Trust Secure Paved Road & Perimeter
<p align="center">
  <img src="https://raw.githubusercontent.com/HoangYell/markdy-com/main/docs/images/scene-zero-trust-paved-road.webp" alt="Zero-Trust Paved Road" width="100%" />
</p>

- **Engine**: `type=architecture` • `theme=editorial`
- **Pattern**: Concentric perimeter defense, WAF DDoS shield, mTLS verified RPCs, and immutable audit logs.
- **[Open in Live Studio ↗](https://markdy.com/playground/)**

---

## ☸️ Cloud Native & Kubernetes

### 5. Production Kubernetes Platform Architecture
<p align="center">
  <img src="https://raw.githubusercontent.com/HoangYell/markdy-com/main/docs/images/scene-kubernetes-cluster.webp" alt="Kubernetes Cluster Blueprint" width="100%" />
</p>

- **Engine**: `type=architecture` • `theme=blueprint`
- **Pattern**: Ingress traffic routing, horizontal pod autoscaling, PersistentVolume attachment, and control plane reconciliation.
- **[Open in Live Studio ↗](https://markdy.com/playground/)**

### 6. Automated CI/CD Canary Delivery Pipeline
<p align="center">
  <img src="https://raw.githubusercontent.com/HoangYell/markdy-com/main/docs/images/scene-cicd-pipeline.webp" alt="CI/CD Pipeline" width="100%" />
</p>

- **Engine**: `type=architecture` • `theme=paper`
- **Pattern**: Parallel build matrix, container registry push, GitOps ArgoCD sync, and Datadog telemetry verification.
- **[Open in Live Studio ↗](https://markdy.com/playground/)**

---

## 📊 Big Data & FinTech Engines

### 7. Lakehouse Medallion Streaming Pipeline
<p align="center">
  <img src="https://raw.githubusercontent.com/HoangYell/markdy-com/main/docs/images/scene-lakehouse-medallion.webp" alt="Lakehouse Medallion Pipeline" width="100%" />
</p>

- **Engine**: `type=medallion` • `theme=editorial`
- **Pattern**: Streaming Bronze (Raw) $\rightarrow$ Silver (Cleaned & Deduplicated) $\rightarrow$ Gold (Aggregates & Feature Store).
- **[Open in Live Studio ↗](https://markdy.com/playground/)**

### 8. Zero-Trust FinTech Core Banking & Ledger
<p align="center">
  <img src="https://raw.githubusercontent.com/HoangYell/markdy-com/main/docs/images/scene-fintech-governance.webp" alt="FinTech Governance Engine" width="100%" />
</p>

- **Engine**: `type=architecture` • `theme=blueprint`
- **Pattern**: Dual-perimeter WAF, mTLS JWT claim verification, Aurora ACID settlement, and Kafka regulatory compliance.
- **[Open in Live Studio ↗](https://markdy.com/playground/)**

---

## 🤝 Contributing Your Templates

Have you created a great Markdy diagram for your project or blog? Share it in our [GitHub Discussions Show & Tell](https://github.com/HoangYell/markdy-com/discussions/categories/show-and-tell)!

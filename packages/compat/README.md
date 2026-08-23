# @markdy/compat

Universal Ingestion Transpilers & Backwards-Compatibility Gate for Markdy.

`@markdy/compat` enables seamless migration from existing diagramming and infrastructure tools into animated, diagram-native MarkdyScript scenes.

---

## Features

- **Mermaid Transpiler**: Converts Mermaid Flowcharts (`flowchart LR/TB/TD`) and Sequence Diagrams (`sequenceDiagram`) into animated Markdy scenes.
- **Draw.io Ingestion**: Converts `.drawio` / `.xml` diagram graphs into structured MarkdyScript scenes with port attachments and label preservation.
- **Docker Compose Ingestion**: Parses `docker-compose.yml` into connected service topologies with port allocations and dependency order.
- **Kubernetes Manifests Transpiler**: Converts multi-document K8s manifests into namespace groups, ingresses, load balancers, and workloads.
- **Terraform State Ingestion**: Converts `.tfstate` files into VPC-clustered infrastructure diagrams.
- **Backwards-Compatibility Snapshot Gate**: Automated regression test suite ensuring Markdy parser stability across releases.

<p align="center">
  <img src="https://raw.githubusercontent.com/HoangYell/markdy-com/main/website/public/images/markdy-universal-ingestion.webp" alt="Universal Ingestion Transpilers" width="900" />
</p>
<p align="center">
  <img src="https://raw.githubusercontent.com/HoangYell/markdy-com/main/website/public/images/scene-nested-security.webp" alt="Kubernetes Manifest Ingestion Preview" width="900" />
</p>

---

## Programmatic API

```typescript
import {
  transpileMermaidToMarkdy,
  transpileDrawioToMarkdy,
  transpileDockerComposeToMarkdy,
  transpileKubernetesManifestsToMarkdy,
  transpileTerraformStateToMarkdy,
} from "@markdy/compat";

// 1. Mermaid Flowchart
const mermaidResult = transpileMermaidToMarkdy(`
  flowchart LR
    Client --> Gateway[API Gateway]
    Gateway --> DB[(Database)]
`);
console.log(mermaidResult.code);

// 2. Docker Compose
const composeCode = transpileDockerComposeToMarkdy(dockerComposeYamlString);

// 3. Kubernetes Manifests
const k8sCode = transpileKubernetesManifestsToMarkdy(k8sManifestYamlString);

// 4. Terraform State
const tfCode = transpileTerraformStateToMarkdy(tfstateJsonString);
```

---

## License

MIT © [Hoang Yell](https://hoangyell.com)

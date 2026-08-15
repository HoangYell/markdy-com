/**
 * packages/compat/src/index.ts
 * Universal Ingestion Transpilers & Compatibility Utilities for Markdy.
 */

export {
  transpileMermaidToMarkdy,
} from "./mermaid/mermaid-transpiler.js";
export type { MermaidTranspileResult } from "./mermaid/mermaid-transpiler.js";

export {
  transpileDockerComposeToMarkdy,
  parseSimpleYaml,
} from "./infra/docker-compose-transpiler.js";
export type { ComposeServiceSpec } from "./infra/docker-compose-transpiler.js";

export {
  transpileKubernetesManifestsToMarkdy,
} from "./infra/k8s-transpiler.js";
export type { K8sManifest } from "./infra/k8s-transpiler.js";

export {
  transpileTerraformStateToMarkdy,
} from "./infra/terraform-transpiler.js";
export type {
  TerraformStateJSON,
  TfResource,
  TfResourceInstance,
  TfResourceAttributes,
} from "./infra/terraform-transpiler.js";

export {
  transpileDrawioToMarkdy,
  parseDrawioXml,
} from "./infra/drawio-transpiler.js";
export type {
  DrawioCell,
  DrawioModel,
} from "./infra/drawio-transpiler.js";

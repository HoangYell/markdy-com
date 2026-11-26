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

export {
  transpileD2ToMarkdy,
} from "./infra/d2-transpiler.js";
export type { D2TranspileResult } from "./infra/d2-transpiler.js";

export {
  transpilePlantUmlToMarkdy,
} from "./infra/plantuml-transpiler.js";
export type { PlantUmlTranspileResult } from "./infra/plantuml-transpiler.js";

export {
  transpileDotToMarkdy,
} from "./infra/dot-transpiler.js";
export type { DotTranspileResult } from "./infra/dot-transpiler.js";

export {
  transpileExcalidrawToMarkdy,
} from "./infra/excalidraw-transpiler.js";
export type {
  ExcalidrawElement,
  ExcalidrawTranspileResult,
} from "./infra/excalidraw-transpiler.js";

export {
  detectDiagramFormat,
  transpileToMarkdy,
} from "./universal.js";
export type {
  CompatFormat,
  TranspileToMarkdyOptions,
  UnifiedTranspileResult,
} from "./universal.js";

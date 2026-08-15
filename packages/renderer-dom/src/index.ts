export type { DiagramOptions, Diagram } from "./diagram.js";
export { createDiagram } from "./diagram.js";
export { ICON_REGISTRY } from "./nodes.js";
export type { IconSpec } from "./nodes.js";

export { encodeGifSequence } from "./export/gif-encoder.js";
export type { AnimationRecordFrame, GifExportOptions } from "./export/gif-encoder.js";

export { exportDiagramAsVectorSvg } from "./export/svg-exporter.js";
export type { SvgExportOptions } from "./export/svg-exporter.js";

export { DiagramPresentationController } from "./presentation-controller.js";
export type { ControllerOptions } from "./presentation-controller.js";

export type { DiagramOptions, Diagram } from "./diagram.js";
export { createDiagram, detectHostTheme } from "./diagram.js";
export { ICON_REGISTRY, iconKeyForNode } from "./nodes.js";
export type { IconSpec } from "./nodes.js";

export { encodeGifSequence } from "./export/gif-encoder.js";
export type { AnimationRecordFrame, GifExportOptions } from "./export/gif-encoder.js";

export { exportDiagramAsGif } from "./export/gif-exporter.js";
export type { GifDiagramExportOptions, TimelineController } from "./export/gif-exporter.js";

export { exportDiagramAsVectorSvg, exportLiveSceneAsPureVectorSvg, renderPureVectorSvg } from "./export/svg-exporter.js";
export type { SvgExportOptions } from "./export/svg-exporter.js";

export { exportDiagramAsPng } from "./export/png-exporter.js";
export type { PngExportOptions } from "./export/png-exporter.js";

export { DiagramPresentationController } from "./presentation-controller.js";
export type { ControllerOptions } from "./presentation-controller.js";

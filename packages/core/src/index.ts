export type {
  AssetDef,
  ActorDef,
  ActorType,
  BuiltinActorType,
  TimelineEvent,
  SceneMeta,
  SceneAST,
  TemplateDef,
  SequenceDef,
  Chapter,
  ParseWarning,
  ImportDecl,
} from "./ast.js";

export { parse, ParseError } from "./parser.js";
export type { ParseOptions } from "./parser.js";

export { PRESETS, PRESET_NAMES } from "./presets.js";
export type { PresetFn } from "./presets.js";

export { registerActorPack } from "./registry.js";
export type { ActorPack } from "./registry.js";

// The language's canonical vocabulary. Tooling (language server, syntax
// highlighting, renderer coverage checks) should import these rather than
// keeping private copies that drift.
export {
  BUILTIN_ACTOR_TYPES,
  UNIVERSAL_ACTION_NAMES,
  FIGURE_ONLY_ACTION_NAMES,
  CAMERA_ACTION_NAMES,
} from "./registry.js";

export {
  TECHNICAL_NODE_TYPES,
  TECHNICAL_NODE_KINDS,
  VISUAL_PRIMITIVE_TYPES,
} from "./system-vocabulary.js";

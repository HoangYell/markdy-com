/**
 * AST types for MarkdyScript — the complete output of the parser.
 * Zero runtime dependencies.
 */
type AssetDef = {
    type: "image" | "icon";
    value: string;
};
type ActorDef = {
    type: "sprite" | "text" | "box";
    /** Constructor arguments: asset name for sprite, display text for text actors. */
    args: string[];
    x: number;
    y: number;
    scale?: number;
    rotate?: number;
    opacity?: number;
    /** Font size in pixels; applies to text actors (via the `size` modifier). */
    size?: number;
};
type TimelineEvent = {
    time: number;
    actor: string;
    action: string;
    params: Record<string, unknown>;
    line: number;
};
type SceneMeta = {
    width: number;
    height: number;
    fps: number;
    bg: string;
    /** Auto-computed from the last event + its dur param when not explicitly set. */
    duration?: number;
};
type SceneAST = {
    meta: SceneMeta;
    assets: Record<string, AssetDef>;
    actors: Record<string, ActorDef>;
    events: TimelineEvent[];
};

declare class ParseError extends Error {
    readonly line: number;
    constructor(message: string, line: number);
}
declare function parse(source: string): SceneAST;

export { type ActorDef, type AssetDef, ParseError, type SceneAST, type SceneMeta, type TimelineEvent, parse };

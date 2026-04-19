#!/usr/bin/env tsx
/**
 * regenerate-all — the single source of truth for MarkdyScript docs & prompts.
 *
 * A feature matrix ↓ lives in this file and drives every downstream artifact:
 *
 *   • docs/SYNTAX.md       — human-readable grammar reference (extended addendum)
 *   • prompts/system-prompt.md   — compact agent instructions
 *   • prompts/system-prompt.json — machine-readable mirror of the spec
 *   • website/public/prompts/*   — copies served by the website
 *
 * Rationale: "A single edit here re-shapes the world." Updating a feature's
 * description, example, or caveat is a one-line change in this file, and
 * `pnpm regen` propagates it everywhere. No doc drift, no prompt drift.
 */

import { readFile, writeFile, mkdir, readdir, copyFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

// ---------------------------------------------------------------------------
// Feature matrix — single source of truth
// ---------------------------------------------------------------------------

interface Feature {
  id: string;
  name: string;
  /** One-line description (used in prompts). */
  summary: string;
  /** Longer markdown description (used in SYNTAX.md). */
  detail: string;
  /** Canonical minimum example. Must parse without errors. */
  example: string;
  /** Link to a full demo under examples/. */
  exampleFile?: string;
}

const FEATURES: Feature[] = [
  {
    id: "caption",
    name: "caption actor",
    summary: "`caption(\"text\") at top|bottom|center` — auto-positioned text overlay centered on the scene.",
    detail: [
      "A `caption` is a first-class actor type for overlay text (titles, subtitles,",
      "meme-format captions). Unlike `text`, captions are self-centering and",
      "position themselves relative to the scene (top ≈ 12% down, bottom ≈ 88%,",
      "center = 50%). You can still apply modifiers (`size`, `opacity`, etc.) and",
      "animate them with any universal action (`fade_in`, `exit`, `move`, ...).",
    ].join(" "),
    example: 'actor title = caption("The Demo") at top',
    exampleFile: "examples/01-caption-basic.markdy",
  },
  {
    id: "chapters",
    name: "chapter blocks",
    summary: "`scene \"title\" { ... }` — named blocks group timeline events into chapters.",
    detail: [
      "A chapter block organizes a run of events under a named heading. Chapters",
      "can be listed in UIs (timeline scrubbers, table of contents) and recorded",
      "in `ast.chapters`. `@+N:` shorthand inside a chapter is relative to the",
      "chapter's own previous event, so chapters compose cleanly.",
    ].join(" "),
    example: 'scene "intro" {\n  @+0.0: hero.enter(from=left, dur=0.4)\n  @+0.2: hero.wave(dur=0.5)\n}',
    exampleFile: "examples/03-chapters.markdy",
  },
  {
    id: "rel-time",
    name: "@+N: relative time",
    summary: "`@+N:` — schedules an event N seconds after the previous event's end in the same scope.",
    detail: [
      "No more hand-counted absolute timestamps. `@+N:` takes the end-time of the",
      "previous event (end = start + dur) and adds N seconds. Scopes are honored:",
      "`@+N` at the top level is relative to the previous top-level event, and",
      "`@+N` inside a chapter is relative to the previous event in that chapter.",
    ].join(" "),
    example: "@0.0:  hero.enter(from=left, dur=0.5)\n@+0.2: hero.say(\"hi\", dur=1.0)",
    exampleFile: "examples/02-at-plus-shorthand.markdy",
  },
  {
    id: "camera",
    name: "camera reserved actor",
    summary: "`camera.pan(to=(x,y))`, `camera.zoom(to=N)`, `camera.shake(intensity=N)` — scene-wide viewpoint moves.",
    detail: [
      "`camera` is a reserved actor name. It has three actions — `pan`, `zoom`,",
      "`shake` — that apply their transform to an inner scene-content layer so",
      "responsive CSS scaling is preserved. You don't declare camera as an actor;",
      "reference it directly. Unknown camera actions soft-warn and no-op.",
    ].join(" "),
    example: "@0.0: camera.zoom(to=1.4, dur=0.8, ease=out)",
    exampleFile: "examples/05-camera-zoom.markdy",
  },
  {
    id: "exit",
    name: "exit action",
    summary: "`actor.exit(to=left|right|top|bottom)` — mirror of enter: slides off-screen and fades to opacity 0.",
    detail: [
      "`exit` is a universal action — it works on any actor type. Like `enter`,",
      "it takes a `to` direction. The animation combines an off-screen translate",
      "with an opacity-to-zero fade, so the actor is visually gone at the end.",
    ].join(" "),
    example: "@2.0: hero.exit(to=right, dur=0.5)",
    exampleFile: "examples/09-exit-action.markdy",
  },
  {
    id: "import",
    name: "import statements",
    summary: "`import \"path.markdy\" as ns` — host-resolved composition of vars, defs, and seqs.",
    detail: [
      "Records the import in `ast.imports`. The parser doesn't open files; hosts",
      "(playground, CLI) pass a `{ imports: { ns: SceneAST } }` map to `parse()`.",
      "Resolved namespaces merge their `vars`, `defs`, and `seqs` into the parent",
      "under `ns.<name>`. Unresolved imports produce a soft `import-unresolved` warning.",
    ].join(" "),
    example: 'import "./characters.markdy" as chars',
    exampleFile: "examples/14-import-namespaced.markdy",
  },
  {
    id: "preset",
    name: "preset expansion",
    summary: "`preset <name>(args...)` — expands at parse time to a full scene template.",
    detail: [
      "Presets are parse-time macros for common scene shapes (meme, explainer,",
      "reaction, countdown, ...). The MarkdyScript source is literally replaced",
      "with the preset's expansion before actor/event parsing begins. A file",
      "whose only content is a `preset <name>` call becomes a complete scene.",
    ].join(" "),
    example: 'preset meme("top line", "bottom line")',
    exampleFile: "examples/presets/meme.markdy",
  },
  {
    id: "must-understand",
    name: "!action must-understand prefix",
    summary: "`actor.!action(...)` — hard-fail on unknown actions. Without `!`, unknowns soft-warn.",
    detail: [
      "By default, unknown actions produce a `ParseWarning` and the renderer",
      "no-ops them. This keeps old scripts parseable as the grammar evolves.",
      "When you'd rather fail-fast — e.g. in CI, or to guard a critical beat —",
      "prefix the action with `!`. A must-understand call to an unknown action",
      "throws `ParseError` at parse time.",
    ].join(" "),
    example: "@1.0: hero.!shake(intensity=6, dur=0.4)",
    exampleFile: "examples/15-must-understand.markdy",
  },
  {
    id: "with-modifiers",
    name: "unified with-modifier form",
    summary: "`with key=val, key=val` — modifier form alongside the space-separated `scale 1.5 rotate 10` syntax.",
    detail: [
      "Two modifier forms are supported; pick whichever reads better:",
      "**space-separated** — `actor x = box() at (10,10) scale 1.5 rotate 10`",
      "or **unified** — `actor x = box() at (10,10) with scale=1.5, rotate=10`.",
      "They can be mixed on the same line (space form first, then `with`).",
      "Unknown modifier keys produce a soft warning and are ignored.",
    ].join(" "),
    example: "actor box1 = box() at (100, 100) with scale=1.2, opacity=0.85, rotate=12",
    exampleFile: "examples/10-unified-modifiers.markdy",
  },
  {
    id: "type-check",
    name: "figure-only type check",
    summary: "Figure-only actions (`punch`, `kick`, `wave`, `nod`, `jump`, `bounce`, `face`, `pose`, `rotate_part`) error on non-figure targets.",
    detail: [
      "The parser now rejects figure-only actions on non-figure actors with a",
      "clear error pointing at the actor type. This catches common mistakes",
      "early — applying `punch` to a `text` actor used to silently no-op; now",
      "it throws `ParseError: action \"punch\" is figure-only; actor type is \"text\"`.",
    ].join(" "),
    example: "# Type check: `text` actors cannot use `punch`\n# @0.0: label.punch(...)   → ParseError",
    exampleFile: "examples/12-figure-type-check.markdy",
  },
];

const WARNING_KINDS: Array<{ kind: string; emittedWhen: string }> = [
  { kind: "unknown-action", emittedWhen: "an action name is not in the parser's known set" },
  { kind: "unknown-camera-action", emittedWhen: "a `camera.*` call uses an unsupported action" },
  { kind: "unknown-modifier", emittedWhen: "a `with key=val` or space-form key is not a known modifier" },
  { kind: "unknown-scene-key", emittedWhen: "the `scene` declaration has an unrecognized property" },
  { kind: "import-unresolved", emittedWhen: "an `import ... as ns` has no matching host-provided namespace" },
];

// ---------------------------------------------------------------------------
// Writers
// ---------------------------------------------------------------------------

function syntaxAddendum(): string {
  const lines: string[] = [];
  lines.push("");
  lines.push("## Extended grammar");
  lines.push("");
  lines.push(
    "The following features are part of the base grammar — no pragma, no opt-in. " +
      "Every feature is additive: existing scripts continue to parse and render identically.",
  );
  lines.push("");

  for (const f of FEATURES) {
    lines.push(`### ${f.name}`);
    lines.push("");
    lines.push(f.detail);
    lines.push("");
    lines.push("```markdy");
    lines.push(f.example);
    lines.push("```");
    if (f.exampleFile) {
      lines.push("");
      lines.push(`Full example: [\`${f.exampleFile}\`](../${f.exampleFile})`);
    }
    lines.push("");
    lines.push("---");
    lines.push("");
  }

  lines.push("## Soft warnings");
  lines.push("");
  lines.push(
    "Where the grammar could have hard-errored, it often emits a `ParseWarning` instead. " +
      "Warnings are attached to `ast.warnings` and surfaced via the renderer's `onWarning` callback. " +
      "This keeps older scripts parseable as the grammar evolves.",
  );
  lines.push("");
  lines.push("| kind | emitted when |");
  lines.push("|------|---|");
  for (const w of WARNING_KINDS) {
    lines.push(`| \`${w.kind}\` | ${w.emittedWhen} |`);
  }
  lines.push("");
  lines.push(
    "Prefix an action with `!` to opt into hard-fail behavior instead: " +
      "`actor.!action(...)` throws `ParseError` on unknown actions.",
  );
  lines.push("");

  return lines.join("\n");
}

const SYNTAX_ADDENDUM_START = "<!-- markdy:regen:syntax-addendum:start -->";
const SYNTAX_ADDENDUM_END = "<!-- markdy:regen:syntax-addendum:end -->";

async function writeSyntaxAddendum(): Promise<void> {
  const path = join(ROOT, "docs/SYNTAX.md");
  const existing = existsSync(path) ? await readFile(path, "utf8") : "";

  const addendum = `\n${SYNTAX_ADDENDUM_START}\n${syntaxAddendum()}${SYNTAX_ADDENDUM_END}\n`;

  let next: string;
  const startIdx = existing.indexOf(SYNTAX_ADDENDUM_START);
  const endIdx = existing.indexOf(SYNTAX_ADDENDUM_END);
  if (startIdx !== -1 && endIdx !== -1) {
    // Replace the existing addendum block.
    next =
      existing.slice(0, startIdx) +
      `${SYNTAX_ADDENDUM_START}\n${syntaxAddendum()}${SYNTAX_ADDENDUM_END}` +
      existing.slice(endIdx + SYNTAX_ADDENDUM_END.length);
  } else {
    // Append a new addendum block.
    next = existing.endsWith("\n") ? existing + addendum : existing + "\n" + addendum;
  }

  await writeFile(path, next);
  console.log(`wrote ${path}`);
}

async function writeSystemPromptMd(): Promise<void> {
  const lines: string[] = [];
  lines.push("# MarkdyScript — system prompt");
  lines.push("");
  lines.push(
    "You are an AI that authors MarkdyScript — a line-based DSL for 2-D animated scenes. " +
      "One statement per line. Comments start with `#`. The grammar below is the complete surface.",
  );
  lines.push("");
  lines.push("## Baseline grammar");
  lines.push("");
  lines.push("```");
  lines.push("scene [key=value ...]                  # optional, once at top");
  lines.push('actor <name> = <type>(<args>) at (x, y) [modifiers]');
  lines.push("@<time>: <actor>.<action>(<params>)    # absolute time");
  lines.push("```");
  lines.push("");
  lines.push("## Extensions");
  lines.push("");
  for (const f of FEATURES) {
    lines.push(`- **${f.name}** — ${f.summary}`);
  }
  lines.push("");
  lines.push("## Soft-warning rules");
  lines.push("");
  lines.push(
    "Unknown actions, modifier keys, and scene keys emit `ParseWarning` instead of throwing. " +
      "Prefix an action with `!` (e.g. `hero.!punch(...)`) to require must-understand semantics.",
  );
  lines.push("");
  lines.push(
    "Figure-only actions (`punch`, `kick`, `wave`, `nod`, `jump`, `bounce`, `face`, `pose`, `rotate_part`) " +
      "hard-fail if the target is not a figure actor.",
  );
  lines.push("");
  lines.push("## Authoring defaults");
  lines.push("");
  lines.push("- Prefer `@+N:` over hand-counted absolute times; it's easier to edit.");
  lines.push("- Group related beats in `scene \"title\" { ... }` blocks.");
  lines.push("- Use `caption(...) at top|bottom|center` for overlay text, never `text` for captions.");
  lines.push("- `camera.pan/zoom/shake` makes scenes feel cinematic — use it sparingly.");
  lines.push("- `preset <name>` is the fastest way to scaffold a scene; edit after expanding.");
  lines.push("");
  lines.push("## Minimum viable scene");
  lines.push("");
  lines.push("```markdy");
  lines.push("scene width=800 height=400 bg=#0d1117");
  lines.push("actor hero = figure(#c68642, m, 😎) at (400, 240)");
  lines.push("@0.0: hero.enter(from=left, dur=0.5)");
  lines.push("@+0.3: hero.wave(side=right, dur=0.5)");
  lines.push("```");
  lines.push("");

  const path = join(ROOT, "prompts/system-prompt.md");
  if (!existsSync(dirname(path))) await mkdir(dirname(path), { recursive: true });
  await writeFile(path, lines.join("\n"));
  console.log(`wrote ${path}`);
}

async function writeSystemPromptJson(): Promise<void> {
  const data = {
    version: "1.0",
    generatedBy: "scripts/regenerate-all.ts",
    features: FEATURES.map((f) => ({
      id: f.id,
      name: f.name,
      summary: f.summary,
      example: f.example,
      exampleFile: f.exampleFile ?? null,
    })),
    warningKinds: WARNING_KINDS,
    mustUnderstandPrefix: "!",
    baselineGrammar: {
      scene: "scene [key=value ...]",
      actor: "actor <name> = <type>(<args>) at (x, y) [modifiers]",
      event: "@<time>: <actor>.<action>(<params>)",
      eventRelative: "@+<offset>: <actor>.<action>(<params>)",
      chapter: "scene \"<title>\" { <events...> }",
    },
    actorTypes: ["sprite", "text", "box", "figure", "caption"],
    reservedActors: ["camera"],
    // Must stay in sync with parser.ts FIGURE_ONLY_ACTIONS / UNIVERSAL_ACTIONS.
    figureOnlyActions: [
      "punch",
      "kick",
      "wave",
      "nod",
      "jump",
      "bounce",
      "face",
      "rotate_part",
      "pose",
    ],
    universalActions: [
      "enter",
      "exit",
      "move",
      "fade_in",
      "fade_out",
      "scale",
      "rotate",
      "shake",
      "say",
      "throw",
      "play",
    ],
    cameraActions: ["pan", "zoom", "shake"],
  };

  const path = join(ROOT, "prompts/system-prompt.json");
  if (!existsSync(dirname(path))) await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(data, null, 2)}\n`);
  console.log(`wrote ${path}`);
}

async function copyPromptsToWebsite(): Promise<void> {
  const src = join(ROOT, "prompts");
  const dst = join(ROOT, "website/public/prompts");
  if (!existsSync(dst)) await mkdir(dst, { recursive: true });

  const files = await readdir(src);
  for (const f of files) {
    if (!/\.(md|json)$/.test(f)) continue;
    await copyFile(join(src, f), join(dst, f));
    console.log(`copied ${f} → website/public/prompts/`);
  }
}

async function writeExamplesReadme(): Promise<void> {
  const lines: string[] = [];
  lines.push("# MarkdyScript examples");
  lines.push("");
  lines.push(
    "Every file in this tree parses cleanly on the current grammar. " +
      "Changes that break an example also break the `verify:examples` gate in CI.",
  );
  lines.push("");
  lines.push("## Layout");
  lines.push("");
  lines.push(
    "- Top-level `.markdy` files — one file per feature. Good starting points when you want " +
      "to learn a specific capability (captions, chapters, camera, imports, etc.).",
  );
  lines.push(
    "- `presets/` — one-line `preset <name>(...)` calls showcasing the built-in scene templates. " +
      "These are the shortest valid MarkdyScript programs that still produce a complete scene.",
  );
  lines.push("");
  lines.push(
    "Compat-gate fixtures (baseline snapshot corpus) live alongside their snapshots in " +
      "`packages/compat/fixtures/` and are covered by `pnpm run gate`.",
  );
  lines.push("");
  lines.push("## Verifying");
  lines.push("");
  lines.push("```bash");
  lines.push("pnpm run verify:examples   # parse every file, assert no regressions");
  lines.push("pnpm run gate              # compat-gate against baseline snapshots");
  lines.push("pnpm run ci                # full test + gate + verify pipeline");
  lines.push("```");
  lines.push("");

  const path = join(ROOT, "examples/README.md");
  await writeFile(path, lines.join("\n"));
  console.log(`wrote ${path}`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  await writeSyntaxAddendum();
  await writeSystemPromptMd();
  await writeSystemPromptJson();
  await copyPromptsToWebsite();
  await writeExamplesReadme();
  console.log("\nregenerate-all: OK");
}

main().catch((err) => {
  console.error("regenerate-all: FAILED");
  console.error(err);
  process.exit(1);
});

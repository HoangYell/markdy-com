import type { ActorDef, Chapter, ImportDecl, SceneAST, SequenceDef, TemplateDef, TimelineEvent } from "@markdy/core";

const BARE_TOKEN_RE = /^[\p{L}\p{N}_.$#/+:-]+$/u;
const MODIFIER_KEYS = ["scale", "rotate", "opacity", "size", "z"] as const;

export function formatScene(ast: SceneAST): string {
  const sections: string[] = [];

  sections.push(formatSceneHeader(ast));

  const vars = Object.entries(ast.vars);
  if (vars.length > 0) {
    sections.push(vars.map(([name, value]) => `var ${name} = ${value}`).join("\n"));
  }

  if (ast.imports.length > 0) {
    sections.push(ast.imports.map(formatImportDecl).join("\n"));
  }

  const assets = Object.entries(ast.assets);
  if (assets.length > 0) {
    sections.push(
      assets
        .map(([name, def]) => `asset ${name} = ${def.type}(${formatToken(def.value)})`)
        .join("\n"),
    );
  }

  const actors = Object.entries(ast.actors);
  if (actors.length > 0) {
    sections.push(actors.map(([name, actor]) => formatActorDecl(name, actor)).join("\n"));
  }

  const defs = Object.entries(ast.defs);
  if (defs.length > 0) {
    sections.push(defs.map(([name, def]) => formatTemplateDef(name, def)).join("\n\n"));
  }

  const seqs = Object.entries(ast.seqs);
  if (seqs.length > 0) {
    sections.push(seqs.map(([name, seq]) => formatSequenceDef(name, seq)).join("\n\n"));
  }

  const timeline = formatTimeline(ast);
  if (timeline) {
    sections.push(timeline);
  }

  return `${sections.filter(Boolean).join("\n\n")}\n`;
}

function formatSceneHeader(ast: SceneAST): string {
  const parts = [
    `scene width=${formatNumber(ast.meta.width)}`,
    `height=${formatNumber(ast.meta.height)}`,
    `fps=${formatNumber(ast.meta.fps)}`,
    `bg=${ast.meta.bg}`,
  ];
  if (ast.meta.duration !== undefined) {
    parts.push(`duration=${formatNumber(ast.meta.duration)}`);
  }
  return parts.join(" ");
}

function formatImportDecl(decl: ImportDecl): string {
  return `import ${JSON.stringify(decl.path)} as ${decl.namespace}`;
}

function formatActorDecl(name: string, actor: ActorDef): string {
  const ctor = `${actor.type}(${actor.args.map(formatToken).join(", ")})`;
  const position = actor.anchor
    ? `at ${actor.anchor}`
    : `at (${formatNumber(actor.x)}, ${formatNumber(actor.y)})`;

  const modifiers = MODIFIER_KEYS
    .flatMap((key) => {
      const value = actor[key];
      return value === undefined ? [] : [`${key}=${formatNumber(value)}`];
    })
    .join(", ");

  return modifiers.length > 0
    ? `actor ${name} = ${ctor} ${position} with ${modifiers}`
    : `actor ${name} = ${ctor} ${position}`;
}

function formatTemplateDef(name: string, def: TemplateDef): string {
  const args = def.bodyArgs.map(formatTemplateArg).join(", ");
  return `def ${name}(${def.params.join(", ")}) {\n  ${def.actorType}(${args})\n}`;
}

function formatTemplateArg(arg: string): string {
  return arg.startsWith("${") && arg.endsWith("}") ? arg : formatToken(arg);
}

function formatSequenceDef(name: string, seq: SequenceDef): string {
  const lines = seq.events.map((event) => {
    const params = event.paramsRaw.trim();
    const suffix = params ? `(${params})` : "()";
    return `  @+${formatNumber(event.offset)}: $.${event.action}${suffix}`;
  });
  return `seq ${name}(${seq.params.join(", ")}) {\n${lines.join("\n")}\n}`;
}

function formatTimeline(ast: SceneAST): string {
  if (ast.events.length === 0 && ast.chapters.length === 0) {
    return "";
  }

  const blocks: Array<{ line: number; text: string }> = [];
  const topLevelEvents = ast.events.filter((event) => event.chapter === undefined);

  for (const event of topLevelEvents) {
    blocks.push({ line: event.line, text: formatEvent(event) });
  }

  const chaptersByLine = [...ast.chapters].sort((a, b) => a.startLine - b.startLine);
  for (let index = 0; index < chaptersByLine.length; index++) {
    const chapter = chaptersByLine[index];
    const nextStartLine = chaptersByLine[index + 1]?.startLine ?? Number.POSITIVE_INFINITY;
    const events = ast.events
      .filter(
        (event) =>
          event.chapter === chapter.name &&
          event.line > chapter.startLine &&
          event.line < nextStartLine,
      )
      .sort((a, b) => a.line - b.line);
    blocks.push({ line: chapter.startLine, text: formatChapter(chapter, events) });
  }

  return blocks
    .sort((a, b) => a.line - b.line)
    .map((block) => block.text)
    .join("\n\n");
}

function formatChapter(chapter: Chapter, events: TimelineEvent[]): string {
  const body = events.length > 0
    ? `\n${events.map((event) => `  ${formatEvent(event)}`).join("\n")}\n`
    : "\n";
  return `scene ${JSON.stringify(chapter.name)} {${body}}`;
}

function formatEvent(event: TimelineEvent): string {
  const params = Object.entries(event.params)
    .map(([key, value]) => `${key}=${formatParamValue(value)}`)
    .join(", ");
  return `@${formatNumber(event.time)}: ${event.actor}.${event.action}(${params})`;
}

function formatParamValue(value: unknown): string {
  if (Array.isArray(value)) {
    return `(${value.map(formatTupleValue).join(", ")})`;
  }
  if (typeof value === "number") {
    return formatNumber(value);
  }
  if (typeof value === "string") {
    return formatToken(value);
  }
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }
  return JSON.stringify(value);
}

function formatTupleValue(value: unknown): string {
  if (typeof value === "number") return formatNumber(value);
  if (typeof value === "string") return formatToken(value);
  return JSON.stringify(value);
}

function formatToken(value: string): string {
  return BARE_TOKEN_RE.test(value) ? value : JSON.stringify(value);
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : String(round3(value));
}

function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}

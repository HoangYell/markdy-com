import type { BeatDecl, Cue, DiagramAST, GroupDecl, NodeDecl, PlayerConfig, StyleDecl } from "./ast.js";

export function formatScene(ast: DiagramAST): string {
  const lines: string[] = [];

  const sceneParts = [`scene`];
  if (ast.meta.title) sceneParts.push(JSON.stringify(ast.meta.title));
  sceneParts.push(`theme=${ast.meta.theme}`);
  if (ast.meta.width !== 1280) sceneParts.push(`width=${ast.meta.width}`);
  if (ast.meta.height !== 720) sceneParts.push(`height=${ast.meta.height}`);
  if (ast.meta.fps !== 60) sceneParts.push(`fps=${ast.meta.fps}`);
  if (ast.meta.duration !== undefined) sceneParts.push(`duration=${ast.meta.duration}`);
  lines.push(sceneParts.join(" "));

  if (ast.meta.direction !== "LR") {
    lines.push(`layout ${ast.meta.direction}`);
  }

  for (const style of Object.values(ast.styles)) {
    lines.push(formatStyle(style));
  }

  for (const node of Object.values(ast.nodes)) {
    lines.push(formatNode(node));
  }

  for (const edge of ast.edges) {
    lines.push(formatEdge(edge));
  }

  for (const group of Object.values(ast.groups)) {
    lines.push(formatGroup(group));
  }

  for (const pattern of Object.values(ast.patterns)) {
    lines.push(`pattern ${pattern.name}(${pattern.params.join(", ")}):`);
    for (const cue of pattern.body) {
      lines.push(`  ${formatCue(cue)}`);
    }
    lines.push("");
  }

  for (const beat of ast.beats) {
    lines.push(formatBeat(beat));
    lines.push("");
  }

  const player = formatPlayer(ast.meta.player);
  if (player.length > 0) {
    if (lines.at(-1) !== "") lines.push("");
    lines.push(...player);
  }

  return `${lines.join("\n").trim()}\n`;
}

function formatPlayer(player: PlayerConfig | undefined): string[] {
  if (!player) return [];

  const groups: Array<[string, Array<[string, boolean | number | string | undefined]>]> = [
    ["playback", [
      ["autoplay", player.playback?.autoplay],
      ["loop", player.playback?.loop],
      ["rate", player.playback?.rate],
    ]],
    ["controls", [
      ["play", player.controls?.play],
      ["restart", player.controls?.restart],
      ["prev_beat", player.controls?.prevBeat],
      ["next_beat", player.controls?.nextBeat],
      ["seek", player.controls?.seek],
      ["speed", player.controls?.speed],
      ["speeds", player.controls?.speeds?.join(" ")],
      ["fit", player.controls?.fit],
      ["reset_view", player.controls?.resetView],
      ["fullscreen", player.controls?.fullscreen],
      ["svg", player.controls?.svg],
      ["share", player.controls?.share],
      ["code", player.controls?.code],
      ["theme", player.controls?.theme],
    ]],
    ["interaction", [
      ["zoom", player.interaction?.zoom],
      ["pan", player.interaction?.pan],
      ["click_to_play", player.interaction?.clickToPlay],
      ["double_click_to_reset", player.interaction?.doubleClickToReset],
      ["keyboard", player.interaction?.keyboard],
    ]],
    ["chrome", [
      ["badge", player.chrome?.badge],
      ["progress", player.chrome?.progress],
      ["color", player.chrome?.progressColor],
    ]],
  ];

  const lines = ["player:"];
  for (const [group, settings] of groups) {
    const configured = settings.filter(([, value]) => value !== undefined);
    if (configured.length === 0) continue;
    lines.push(`  ${group}:`);
    for (const [key, value] of configured) {
      const formatted = typeof value === "string" && key !== "progress" ? JSON.stringify(value) : String(value);
      lines.push(`    ${key} ${formatted}`);
    }
  }

  return lines.length > 1 ? lines : [];
}

function formatStyle(style: StyleDecl): string {
  const props = Object.entries(style.props)
    .map(([k, v]) => `${k}=${formatValue(v)}`)
    .join(" ");
  return `style ${style.name} = ${props}`;
}

function formatNode(node: NodeDecl): string {
  let line = `${node.kind} ${node.id}`;
  if (node.label !== node.id && node.label) line += ` ${JSON.stringify(node.label)}`;
  if (node.style) line += ` style=${node.style}`;
  const extraProps = Object.entries(node.props).filter(([key]) => key !== "style");
  for (const [key, value] of extraProps) {
    line += ` ${key}=${formatValue(value)}`;
  }
  return line;
}

function formatEdge(edge: { id: string; kind: string; from: string; to: string; label?: string }): string {
  const op = edge.kind === "request" ? "->" : edge.kind === "response" ? "<-" : edge.kind === "event" ? "~>" : "--";
  // Response edges are stored reversed (data-flow direction); print in source order.
  const [left, right] = edge.kind === "response" ? [edge.to, edge.from] : [edge.from, edge.to];
  let chain = `${left} ${op} ${right}`;
  if (edge.label) chain += ` ${JSON.stringify(edge.label)}`;
  return `edge ${edge.id}: ${chain}`;
}

function formatGroup(group: GroupDecl): string {
  const label = group.label ? ` ${JSON.stringify(group.label)}` : "";
  return `group ${group.id}${label}: ${group.members.join(" ")}`;
}

function formatBeat(beat: BeatDecl): string {
  const label = beat.label ? ` ${JSON.stringify(beat.label)}` : "";
  const lines = [`beat ${beat.name}${label}:`];
  for (const cue of beat.cues) {
    lines.push(`  ${formatCue(cue)}`);
  }
  return lines.join("\n");
}

function formatCue(cue: Cue): string {
  if (cue.kind === "parallel") {
    return cue.cues.map(formatCue).join(" & ");
  }
  if (cue.kind === "flow") {
    let chain = "";
    for (let i = 0; i < cue.segments.length; i++) {
      const seg = cue.segments[i];
      const op = seg.op === "request" ? "->" : seg.op === "response" ? "<-" : seg.op === "event" ? "~>" : "--";
      // Response edges are stored reversed (data-flow direction); print in source order.
      const [left, right] = seg.op === "response" ? [seg.to, seg.from] : [seg.from, seg.to];
      if (i === 0) chain += left;
      chain += ` ${op} ${right}`;
      if (seg.label) chain += ` ${JSON.stringify(seg.label)}`;
    }
    if (cue.dur !== undefined) chain += ` dur=${cue.dur}s`;
    return chain;
  }
  if (cue.kind === "show" || cue.kind === "hide") {
    let line = `${cue.kind} ${cue.targets.join(" ")}`;
    if (cue.kind === "show" && cue.stagger !== undefined) line += ` stagger=${cue.stagger}s`;
    if (cue.dur !== undefined) line += ` dur=${cue.dur}s`;
    return line;
  }
  if (cue.kind === "glow") {
    let line = `glow ${cue.targets.join(" ")}`;
    if (cue.color) line += ` color=${cue.color}`;
    if (cue.strength !== undefined) line += ` strength=${cue.strength}`;
    if (cue.dur !== undefined) line += ` dur=${cue.dur}s`;
    return line;
  }
  if (cue.kind === "focus") {
    let line = `focus ${cue.targets.join(" ")}`;
    if (cue.zoom !== undefined) line += ` zoom=${cue.zoom}`;
    if (cue.dur !== undefined) line += ` dur=${cue.dur}s`;
    return line;
  }
  if (cue.kind === "frame") {
    let line = `frame ${cue.targets.join(" ")}`;
    if (cue.zoom !== undefined) line += ` zoom=${cue.zoom}`;
    if (cue.dur !== undefined) line += ` dur=${cue.dur}s`;
    return line;
  }
  if (cue.kind === "use") {
    const args = Object.entries(cue.args)
      .map(([k, v]) => (k.startsWith("__pos_") ? v : `${k}=${v}`))
      .join(", ");
    return `use ${cue.pattern}(${args})`;
  }
  return "";
}

function formatValue(value: unknown): string {
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

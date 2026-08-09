import { describe, it, expect } from "vitest";
import { parse, compile, ParseError } from "../src/parser.js";
import type { Cue } from "../src/ast.js";

const isFlow = (c: Cue): c is Extract<Cue, { kind: "flow" }> => c.kind === "flow";

const URL_SHORTENER = `
scene "URL Shortener Architecture" theme=midnight
layout LR

user Visitor
browser WebClient
gateway ApiGateway
service UrlShortener
service RedirectService
cache HotUrlCache
db UrlMappingDb

group storage: HotUrlCache UrlMappingDb

beat layout:
  show $nodes stagger=60ms

beat create:
  WebClient -> ApiGateway "POST /shorten" -> UrlShortener
  UrlShortener -> UrlMappingDb "store slug" & UrlShortener ~> HotUrlCache "warm cache"
  WebClient <- UrlShortener "short.ly/a7"

beat finish:
  glow storage color=#22c55e
`;

describe("diagram parser", () => {
  it("parses scene meta and nodes", () => {
    const ast = parse(URL_SHORTENER);
    expect(ast.meta.title).toBe("URL Shortener Architecture");
    expect(ast.meta.theme).toBe("midnight");
    expect(ast.meta.direction).toBe("LR");
    expect(Object.keys(ast.nodes)).toHaveLength(7);
    expect(ast.nodes.WebClient.kind).toBe("browser");
    expect(ast.nodes.ApiGateway.label).toBe("API Gateway");
    expect(ast.nodes.UrlMappingDb.label).toBe("URL Mapping DB");
  });

  it("humanizes unlabeled node ids while preserving technical casing", () => {
    const ast = parse(`
scene theme=midnight
cli kubectl
database etcd
service ApiServer
cdn CdnEdge
`);

    expect(ast.nodes.kubectl.label).toBe("kubectl");
    expect(ast.nodes.etcd.label).toBe("etcd");
    expect(ast.nodes.ApiServer.label).toBe("API Server");
    expect(ast.nodes.CdnEdge.label).toBe("CDN Edge");
  });

  it("parses groups and beats", () => {
    const ast = parse(URL_SHORTENER);
    expect(ast.groups.storage.members).toEqual(["HotUrlCache", "UrlMappingDb"]);
    expect(ast.beats.map((b) => b.name)).toEqual(["layout", "create", "finish"]);
    expect(ast.beats[1].cues[0].kind).toBe("flow");
  });

  it("rejects statements outside the diagram grammar", () => {
    expect(() => parse("unknown Api")).toThrow(ParseError);
    expect(() => parse("Client => API")).toThrow(ParseError);
    expect(() => parse('actor x = box() at (0,0)')).toThrow(ParseError);
    expect(() => parse("@0.0: x.fade_in()")).toThrow(ParseError);
    expect(() => parse("def path(a, b):")).toThrow(ParseError);
    expect(() => parse("seq main:")).toThrow(ParseError);
    expect(() => parse('asset logo = "logo.svg"')).toThrow(ParseError);
    expect(() => parse("service API\nbeat main:\n  figure(API)")).toThrow(ParseError);
  });

  it("compiles to render plan", () => {
    const ast = parse(URL_SHORTENER);
    const plan = compile(ast);
    expect(plan.nodes.length).toBe(7);
    expect(plan.duration).toBeGreaterThan(0);
    expect(plan.title).toBe("URL Shortener Architecture");
    expect(plan.cues.some((c) => c.kind === "flow")).toBe(true);
  });

  it("extracts trailing labels from flow targets and keeps node ids clean", () => {
    const ast = parse(URL_SHORTENER);
    const create = ast.beats.find((b) => b.name === "create")!;
    const firstFlow = create.cues.filter(isFlow)[0];
    expect(firstFlow.segments[0]).toMatchObject({ from: "WebClient", to: "ApiGateway", label: "POST /shorten" });
    expect(firstFlow.segments[1]).toMatchObject({ from: "ApiGateway", to: "UrlShortener" });
  });

  it("reverses response edges while keeping their label", () => {
    const ast = parse(URL_SHORTENER);
    const create = ast.beats.find((b) => b.name === "create")!;
    const response = create.cues
      .filter(isFlow)
      .flatMap((c) => c.segments)
      .find((s) => s.op === "response");
    expect(response).toMatchObject({ from: "UrlShortener", to: "WebClient", label: "short.ly/a7" });
  });

  it("only references declared nodes in compiled flow cues", () => {
    const plan = compile(parse(URL_SHORTENER));
    const nodeIds = new Set(plan.nodes.map((n) => n.id));
    for (const cue of plan.cues) {
      if (cue.kind !== "flow") continue;
      for (const id of cue.targets) expect(nodeIds.has(id)).toBe(true);
    }
  });

  it("parses frame cues and beat labels for camera-guided storytelling", () => {
    const ast = parse(`
scene "Framed Story" theme=paper
layout LR
service API
database DB
group backend: API DB

beat inspect "Zoom into backend":
  frame backend zoom=1.25 dur=500ms
`);
    expect(ast.beats[0].label).toBe("Zoom into backend");
    expect(ast.beats[0].cues[0]).toMatchObject({
      kind: "frame",
      targets: ["backend"],
      zoom: 1.25,
      dur: 0.5,
    });
  });

  it("emits warnings for unresolved references without accepting invalid syntax", () => {
    const ast = parse(`
scene "Diagnostics" theme=paper
style hot = fill=#f59e0b
service API style=missing
group backend: API Worker

beat main:
  show Worker
  frame backend
  API -> Missing "call"
`);

    expect(ast.diagnostics.map((d) => d.message)).toEqual(expect.arrayContaining([
      "node 'API' references unknown style 'missing'",
      "group 'backend' references unknown node 'Worker'",
      "show references unknown target 'Worker'",
      "flow references unknown node 'Missing'",
    ]));
  });

  it("substitutes all positional pattern arguments without leaking internal keys", () => {
    const ast = parse(`
scene "Pattern Args" theme=paper
service A
service B
service C
service D
service E

pattern five(a, b, c, d, e):
  $a -> $b "one"
  $c -> $d "two"
  frame $e

beat main:
  use five(A, B, C, D, E)
`);
    const cues = ast.beats[0].cues;
    expect(cues[0]).toMatchObject({ kind: "flow", segments: [{ from: "A", to: "B" }] });
    expect(cues[1]).toMatchObject({ kind: "flow", segments: [{ from: "C", to: "D" }] });
    expect(cues[2]).toMatchObject({ kind: "frame", targets: ["E"] });
  });

  it("accepts common AI-generated brace blocks, hash comments, and inline scene layout", () => {
    const ast = parse(`
scene "URL Shortener Architecture" width=1280 height=720 fps=60 layout LR theme=midnight

# System Nodes
client Client "Client / Browser"
api_gateway Gateway "API Gateway"
service URLService "URL Shortener Service"
cache Cache "Redis Cache"
database DB "Primary Database"

# Beat 1: Initial Reveal
beat reveal "System Initialization" {
  show $nodes stagger=60ms
}

# Beat 2: Write Path (Shortening a URL)
beat write_path "Write Path: Shorten URL" {
  Client -> Gateway "POST /api/v1/shorten"
  Gateway -> URLService "Route request"
  URLService -> DB "Insert original URL & generate hash"
  URLService ~> Cache "Async write-through / cache populate"
  Gateway <- URLService "201 Created (shortCode)"
  Client <- Gateway "201 Created (https://short.url/xyz)"
}

# Beat 4: Hot Path Emphasis & Focus
beat hot_path "Hot Path Optimization" {
  glow Cache color="#00E5FF" strength=1.5 dur=0.8s
  & focus Cache zoom=1.15 dur=0.8s
}
`);

    expect(ast.meta).toMatchObject({
      title: "URL Shortener Architecture",
      width: 1280,
      height: 720,
      fps: 60,
      direction: "LR",
      theme: "midnight",
    });
    expect(ast.diagnostics).toEqual([]);
    expect(ast.beats.map((beat) => beat.name)).toEqual(["reveal", "write_path", "hot_path"]);
    const writePath = ast.beats.find((beat) => beat.name === "write_path")!;
    const dbFlow = writePath.cues
      .filter(isFlow)
      .flatMap((cue) => cue.segments)
      .find((segment) => segment.to === "DB");
    expect(dbFlow?.label).toBe("Insert original URL & generate hash");
    const response = writePath.cues
      .filter(isFlow)
      .flatMap((cue) => cue.segments)
      .find((segment) => segment.to === "Client");
    expect(response?.label).toBe("201 Created (https://short.url/xyz)");
    const hotPath = ast.beats.find((beat) => beat.name === "hot_path")!;
    expect(hotPath.cues[0]).toMatchObject({
      kind: "parallel",
      cues: [
        { kind: "glow", targets: ["Cache"], color: "#00E5FF", strength: 1.5, dur: 0.8 },
        { kind: "focus", targets: ["Cache"], zoom: 1.15, dur: 0.8 },
      ],
    });
  });

  it("rejects unsupported drawing/timeline syntax with actionable guidance", () => {
    expect(() => parse(`
scene width=1000 height=520
var bg_color = "#0f172a"
`)).toThrow("unsupported variable declaration");

    expect(() => parse(`
scene width=1000 height=520
actor Alice = figure(#ffdbac, f, "dev") at (80, 200)
`)).toThrow("unsupported manual drawing syntax");

    expect(() => parse(`
scene "Legacy Chapter" {
  @0.0: header.say("Step 1")
}
`)).toThrow("nested scene blocks are not supported");

    expect(() => parse(`
scene "Demo"
service API
beat main:
  @+1.0: camera.pan(to=(500, 260), dur=1.0)
`)).toThrow("unsupported timeline command");
  });
});

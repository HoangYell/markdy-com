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

  it("rejects legacy actor syntax", () => {
    expect(() => parse('actor x = box() at (0,0)')).toThrow(ParseError);
    expect(() => parse("@0.0: x.fade_in()")).toThrow(ParseError);
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
});

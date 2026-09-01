import { describe, it, expect } from "vitest";
import {
  resolveVectorSymbol,
  renderSymbolSvg,
  listAvailableSymbols,
  VECTOR_SYMBOLS,
} from "../src/symbols.js";

describe("Native Vector Symbol Registry", () => {
  it("resolves exact symbol keys and known aliases", () => {
    expect(resolveVectorSymbol("aws")?.name).toBe("AWS");
    expect(resolveVectorSymbol("postgres")?.name).toBe("PostgreSQL");
    expect(resolveVectorSymbol("k8s")?.name).toBe("Kubernetes");
    expect(resolveVectorSymbol("redis")?.name).toBe("Redis");
    expect(resolveVectorSymbol("kafka")?.name).toBe("Apache Kafka");
    expect(resolveVectorSymbol("unknown_xyz")).toBeNull();
  });

  it("renders valid inline SVG strings with custom sizes", () => {
    const svg = renderSymbolSvg("redis", { size: 24, className: "tech-icon" });
    expect(svg).toContain('<svg xmlns="http://www.w3.org/2000/svg"');
    expect(svg).toContain('viewBox="0 0 24 24"');
    expect(svg).toContain('width="24"');
    expect(svg).toContain('class="tech-icon"');
  });

  it("lists all available registered symbols", () => {
    const symbols = listAvailableSymbols();
    expect(symbols.length).toBeGreaterThanOrEqual(15);
    expect(symbols).toContain("postgresql");
    expect(symbols).toContain("docker");
    expect(symbols).toContain("cloudflare");
  });
});

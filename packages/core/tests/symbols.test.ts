import { describe, it, expect } from "vitest";
import {
  resolveVectorSymbol,
  resolveBrandLogoUrl,
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

  it("resolves modern cloud and web architecture symbols and aliases", () => {
    expect(resolveVectorSymbol("vercel")?.name).toBe("Vercel");
    expect(resolveVectorSymbol("nextjs")?.name).toBe("Next.js");
    expect(resolveVectorSymbol("next")?.name).toBe("Next.js");
    expect(resolveVectorSymbol("hono")?.name).toBe("Hono");
    expect(resolveVectorSymbol("neon")?.name).toBe("Neon Postgres");
    expect(resolveVectorSymbol("clerk")?.name).toBe("Clerk");
    expect(resolveVectorSymbol("stripe")?.name).toBe("Stripe");
    expect(resolveVectorSymbol("supabase")?.name).toBe("Supabase");
    expect(resolveVectorSymbol("turborepo")?.name).toBe("Turborepo");
    expect(resolveVectorSymbol("turbo")?.name).toBe("Turborepo");
    expect(resolveVectorSymbol("drizzle")?.name).toBe("Drizzle ORM");
    expect(resolveVectorSymbol("tailwind")?.name).toBe("Tailwind CSS");
    expect(resolveVectorSymbol("tailwindcss")?.name).toBe("Tailwind CSS");
    expect(resolveVectorSymbol("tw")?.name).toBe("Tailwind CSS");
    expect(resolveVectorSymbol("astro")?.name).toBe("Astro");
    expect(resolveVectorSymbol("react")?.name).toBe("React");
  });

  it("resolves canonical SVGL CDN URL for external brands", () => {
    expect(resolveBrandLogoUrl("better-auth")).toBe("https://svgl.app/library/better-auth.svg");
    expect(resolveBrandLogoUrl("TanStack Query")).toBe("https://svgl.app/library/tanstack-query.svg");
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
    expect(symbols.length).toBeGreaterThanOrEqual(30);
    expect(symbols).toContain("postgresql");
    expect(symbols).toContain("docker");
    expect(symbols).toContain("cloudflare");
    expect(symbols).toContain("nextjs");
    expect(symbols).toContain("hono");
    expect(symbols).toContain("neon");
  });
});

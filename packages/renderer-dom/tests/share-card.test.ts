import { describe, it, expect } from "vitest";
import { renderShareCardSvg } from "../src/export/share-card.js";

describe("Contextual Share Card Vector Generator", () => {
  const dummySvg = `<svg viewBox="0 0 800 400" width="800" height="400"><rect width="800" height="400" fill="#0e1a2c"/><circle cx="100" cy="100" r="40" fill="#38bdf8"/></svg>`;

  it("renders a standard 1200x630 share card SVG with title and branding", () => {
    const cardSvg = renderShareCardSvg(dummySvg, {
      title: "Microservices Architecture Map",
      theme: "midnight",
      variant: "standard",
    });

    expect(cardSvg).toContain('viewBox="0 0 1200 630"');
    expect(cardSvg).toContain("Microservices Architecture Map");
    expect(cardSvg).toContain("MARKDY SYSTEM MAP");
    expect(cardSvg).toContain("markdy.com • Deterministic Vector Verification");
    expect(cardSvg).toContain("<svg");
  });

  it("renders a route pathfinder share card with hops and route telemetry", () => {
    const cardSvg = renderShareCardSvg(dummySvg, {
      title: "Checkout Flow",
      variant: "route",
      from: "Client",
      to: "PaymentService",
      hops: 3,
      protocol: "mTLS / HTTP2",
    } as any);

    expect(cardSvg).toContain("ROUTE PATHFINDER");
    expect(cardSvg).toContain("Active Route: Client → PaymentService • 3 hops • mTLS / HTTP2");
  });

  it("renders a reach blast radius share card with direction and node count", () => {
    const cardSvg = renderShareCardSvg(dummySvg, {
      title: "Database Outage Blast Radius",
      variant: "reach",
      rootId: "PrimaryDB",
      direction: "upstream",
      impactedNodeCount: 5,
      maxDepth: 3,
    } as any);

    expect(cardSvg).toContain("BLAST RADIUS LENS");
    expect(cardSvg).toContain("Root: PrimaryDB • Direction: UPSTREAM • 5 Impacted Nodes • Depth: 3");
  });
});

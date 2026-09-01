import { describe, it, expect } from "vitest";
import { parse } from "@markdy/core";
import { calculateBlastRadius, findShortestRoute } from "../src/impact.js";

describe("Impact Lens & Route Pathfinder", () => {
  const code = `
scene "FinTech Mesh"
browser Client "Web App"
gateway Gateway "API Gateway"
service Auth "Auth Svc"
service Payment "Payment Svc"
database LedgerDb "Ledger DB"
service Audit "Audit Svc"

beat flow:
  Client -> Gateway "POST /checkout"
  Gateway -> Auth "Validate Token"
  Gateway -> Payment "Process Card"
  Payment -> LedgerDb "Write Transaction"
  Payment -> Audit "Send Event"
`;

  const ast = parse(code);

  it("calculates upstream callers and downstream blast radius for a service", () => {
    const impact = calculateBlastRadius("Payment", ast);

    expect(impact.rootNodeId).toBe("Payment");
    // Upstream callers (Client -> Gateway -> Payment)
    expect(impact.upstreamNodeIds).toContain("Gateway");
    expect(impact.upstreamNodeIds).toContain("Client");

    // Downstream dependents (Payment -> LedgerDb, Payment -> Audit)
    expect(impact.downstreamNodeIds).toContain("LedgerDb");
    expect(impact.downstreamNodeIds).toContain("Audit");
    expect(impact.downstreamNodeIds).not.toContain("Auth");
  });

  it("finds topological shortest route between two components", () => {
    const route = findShortestRoute("Client", "LedgerDb", ast);
    expect(route).toEqual(["Client", "Gateway", "Payment", "LedgerDb"]);

    const nonExistent = findShortestRoute("Auth", "LedgerDb", ast);
    expect(nonExistent).toBeNull();
  });
});

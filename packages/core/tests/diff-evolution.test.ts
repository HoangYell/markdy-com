import { describe, it, expect } from "vitest";
import { diffDiagramASTs } from "../src/diff.js";
import { parse } from "../src/parser.js";

describe("Architectural Evolution & Diff Engine", () => {
  it("computes structural delta between two architecture versions", () => {
    const v1 = `
scene "Monolith v1"
service Monolith "Monolith Service"
database Postgres "Postgres 14"
beat baseline:
  Monolith -> Postgres "SQL Queries"
`;

    const v2 = `
scene "Microservices v2"
gateway ApiGateway "API Gateway"
service UserSvc "User Service"
service OrderSvc "Order Service"
database Postgres "Postgres 16"
cache Redis "Redis Cluster"
beat target:
  ApiGateway -> UserSvc "Route /user"
  ApiGateway -> OrderSvc "Route /order"
  UserSvc -> Postgres "User Data"
  OrderSvc -> Redis "Cache"
`;

    const ast1 = parse(v1);
    const ast2 = parse(v2);

    const diff = diffDiagramASTs(ast1, ast2);

    expect(diff.addedNodesCount).toBe(4);
    expect(diff.removedNodesCount).toBe(1);
    expect(diff.nodes.find((n) => n.id === "Monolith")?.status).toBe("removed");
    expect(diff.nodes.find((n) => n.id === "ApiGateway")?.status).toBe("added");
    expect(diff.nodes.find((n) => n.id === "Postgres")?.status).toBe("modified");

    expect(diff.summaryMarkdown).toContain("Markdy Architectural Diff Summary");
    expect(diff.evolutionMarkdyScript).toContain('beat baseline:');
    expect(diff.evolutionMarkdyScript).toContain('beat transition:');
  });
});

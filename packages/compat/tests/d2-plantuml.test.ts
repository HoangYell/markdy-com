import { describe, it, expect } from "vitest";
import { transpileD2ToMarkdy, transpilePlantUmlToMarkdy } from "../src/index.js";

describe("D2 & PlantUML Universal Ingestion", () => {
  it("transpiles D2 diagram script into clean MarkdyScript", () => {
    const d2Code = `
title: "Microservices Gateway"
client: Web Browser
gateway: API Gateway
orderSvc: Order Service
db: Postgres DB

backend: {
  orderSvc
  db
}

client -> gateway: GET /orders
gateway -> orderSvc: Process
orderSvc -> db: Query
`;
    const result = transpileD2ToMarkdy(d2Code);
    expect(result.nodeCount).toBe(4);
    expect(result.edgeCount).toBe(3);
    expect(result.containerCount).toBe(1);
    expect(result.markdyScript).toContain('scene "Microservices Gateway" theme=midnight');
    expect(result.markdyScript).toContain('group backend "backend": orderSvc db');
    expect(result.markdyScript).toContain('client -> gateway "GET /orders"');
  });

  it("transpiles PlantUML component diagram into MarkdyScript", () => {
    const pumlCode = `
@startuml
title Payment Processing System

actor User as client
boundary Gateway as gw
database "Orders Database" as orders_db

package "Internal Services" as internal {
  component "Payment API" as pay_api
}

client -> gw : POST /pay
gw -> pay_api : Forward
pay_api -> orders_db : Save Transaction
@enduml
`;
    const result = transpilePlantUmlToMarkdy(pumlCode);
    expect(result.nodeCount).toBe(4);
    expect(result.edgeCount).toBe(3);
    expect(result.groupCount).toBe(1);
    expect(result.markdyScript).toContain('scene "Payment Processing System" theme=auto');
    expect(result.markdyScript).toContain('group internal "Internal Services": pay_api');
    expect(result.markdyScript).toContain('client -> gw "POST /pay"');
  });

  it("transpiles PlantUML C4 architecture macros into MarkdyScript", () => {
    const c4Puml = `
@startuml
Person(customer, "Banking Customer", "An active banking client")
Container(spa, "Single Page App", "React / TypeScript", "Provides online banking features")
ContainerDb(db, "Primary Database", "PostgreSQL 16", "Stores transactions")

Rel(customer, spa, "Uses", "HTTPS")
Rel(spa, db, "Reads & Writes", "SQL/mTLS")
@enduml
`;
    const result = transpilePlantUmlToMarkdy(c4Puml);
    expect(result.nodeCount).toBe(3);
    expect(result.edgeCount).toBe(2);
    expect(result.markdyScript).toContain('browser customer "Banking Customer" icon=chrome');
    expect(result.markdyScript).toContain('database db "Primary Database" icon=postgresql');
    expect(result.markdyScript).toContain('customer -> spa "Uses (HTTPS)"');
    expect(result.markdyScript).toContain('spa -> db "Reads & Writes (SQL/mTLS)"');
  });

  it("transpiles D2 nested container paths and shapes", () => {
    const d2Code = `
vpc.app: "Web App"
vpc.cache: "Redis Cache"
vpc.cache.shape: cylinder
vpc.cache.icon: redis

vpc.app -> vpc.cache: "Cache Lookup"
`;
    const result = transpileD2ToMarkdy(d2Code);
    expect(result.nodeCount).toBe(2);
    expect(result.containerCount).toBe(1);
    expect(result.markdyScript).toContain('database vpc_cache "Redis Cache" icon=redis');
    expect(result.markdyScript).toContain('group vpc "vpc": vpc_app vpc_cache');
  });
});


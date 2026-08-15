import { describe, it, expect } from "vitest";
import {
  transpileMermaidToMarkdy,
  transpileDockerComposeToMarkdy,
  transpileKubernetesManifestsToMarkdy,
  transpileTerraformStateToMarkdy,
  transpileDrawioToMarkdy,
} from "../src/index.js";
import { parse } from "@markdy/core";

describe("@markdy/compat: Universal Ingestion Transpilers", () => {
  it("transpiles Mermaid flowcharts to valid MarkdyScript", () => {
    const mmd = `
      flowchart LR
        Client[Web Client] --> Gateway[API Gateway]
        Gateway --> DB[(Postgres DB)]
    `;
    const result = transpileMermaidToMarkdy(mmd, "Test Flow");
    expect(result.diagramType).toBe("architecture");
    const ast = parse(result.code);
    expect(Object.keys(ast.nodes)).toHaveLength(3);
    expect(ast.nodes["DB"].kind).toBe("database");
    expect(ast.nodes["Client"].kind).toBe("browser");
  });

  it("transpiles Mermaid sequence diagrams to valid MarkdyScript", () => {
    const mmd = `
      sequenceDiagram
        participant User as End User
        participant Auth as Auth Server
        participant DB as Database
        User->>Auth: Login Request
        Auth->>DB: Query User
        DB-->>Auth: User Record
        Auth-->>User: 200 Token
    `;
    const result = transpileMermaidToMarkdy(mmd, "Auth Sequence");
    expect(result.diagramType).toBe("sequence");
    const ast = parse(result.code);
    expect(Object.keys(ast.nodes)).toHaveLength(3);
    expect(ast.meta.type).toBe("sequence");
    expect(ast.beats).toHaveLength(1);
  });

  it("transpiles Docker Compose to valid MarkdyScript", () => {
    const yaml = `
      services:
        web:
          image: nginx:alpine
          ports: ["80:80"]
          depends_on: ["api"]
        api:
          image: node:20
          depends_on: ["db", "cache"]
        db:
          image: postgres:15
        cache:
          image: redis:7
    `;
    const code = transpileDockerComposeToMarkdy(yaml, "Microservices App");
    const ast = parse(code);
    expect(Object.keys(ast.nodes)).toHaveLength(4);
    expect(ast.nodes["db"].kind).toBe("database");
    expect(ast.nodes["cache"].kind).toBe("cache");
    expect(ast.nodes["web"].kind).toBe("api_gateway");
    expect(ast.beats).toHaveLength(1);
  });

  it("transpiles Kubernetes Manifests into grouped MarkdyScript", () => {
    const k8sYaml = `
apiVersion: apps/v1
kind: Deployment
metadata:
  name: auth-service
  namespace: security
spec:
  replicas: 2
---
apiVersion: v1
kind: Service
metadata:
  name: auth-svc
  namespace: security
spec:
  type: LoadBalancer
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: main-ingress
  namespace: ingress-nginx
spec:
  rules: []
    `;

    const code = transpileKubernetesManifestsToMarkdy(k8sYaml, "K8s Topology");
    const ast = parse(code);
    expect(Object.keys(ast.nodes)).toHaveLength(3);
    expect(Object.keys(ast.groups).length).toBeGreaterThanOrEqual(1);
    expect(ast.beats).toHaveLength(1);
  });

  it("transpiles Terraform State into clustered Markdy architecture", () => {
    const tfState = JSON.stringify({
      version: 4,
      resources: [
        {
          type: "aws_lb",
          name: "public_alb",
          provider: "aws",
          instances: [
            {
              attributes: {
                name: "prod-alb",
                vpc_id: "vpc_12345",
              },
            },
          ],
        },
        {
          type: "aws_rds_cluster",
          name: "aurora_postgres",
          provider: "aws",
          instances: [
            {
              attributes: {
                name: "prod-aurora-db",
                vpc_id: "vpc_12345",
              },
            },
          ],
        },
      ],
    });

    const code = transpileTerraformStateToMarkdy(tfState, "AWS Production Setup");
    const ast = parse(code);
    expect(Object.keys(ast.nodes)).toHaveLength(2);
    expect(ast.groups["vpc_12345"]).toBeDefined();
    expect(ast.beats).toHaveLength(1);
  });

  it("transpiles Draw.io XML models into connected MarkdyScript", () => {
    const drawioXml = `
      <mxGraphModel>
        <root>
          <mxCell id="0"/>
          <mxCell id="1" parent="0"/>
          <mxCell id="client" value="Mobile User" style="shape=actor;" vertex="1" parent="1"/>
          <mxCell id="edge_gw" value="Cloudflare Edge" style="shape=hexagon;" vertex="1" parent="1"/>
          <mxCell id="db" value="Order DB" style="shape=cylinder;" vertex="1" parent="1"/>
          <mxCell id="e1" value="HTTPS" edge="1" source="client" target="edge_gw" parent="1"/>
          <mxCell id="e2" value="Read / Write" edge="1" source="edge_gw" target="db" parent="1"/>
        </root>
      </mxGraphModel>
    `;

    const result = transpileDrawioToMarkdy(drawioXml, "Fintech App");
    expect(result.nodeCount).toBe(3);
    expect(result.edgeCount).toBe(2);

    const ast = parse(result.code);
    expect(Object.keys(ast.nodes)).toHaveLength(3);
    expect(ast.nodes["client"].kind).toBe("user");
    expect(ast.nodes["edge_gw"].kind).toBe("api_gateway");
    expect(ast.nodes["db"].kind).toBe("database");
  });
});

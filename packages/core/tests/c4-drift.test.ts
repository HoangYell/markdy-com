import { describe, it, expect } from "vitest";
import { parseAndCompile } from "../src/parser.js";
import {
  analyzeC4Model,
  filterC4Hierarchy,
  generateC4Storyboard,
  exportC4LevelViews,
  validateC4Containment,
} from "../src/c4.js";
import { detectArchitectureDrift, autoHealArchitectureDrift } from "../src/drift.js";

describe("C4 Model & Architecture Drift Engines", () => {
  const code = `
scene "E-Commerce System" theme=midnight
layout LR

client Customer "Customer" @c4=1
gateway Gateway "API Gateway" @c4=2
service OrderSvc "Order Service" @c4=2 @src="src/orders/index.ts#L10"
service TaxCalc "Tax Calculator Module" @c4=3
database OrdersDB "Orders PostgreSQL" @c4=2

beat main:
  Customer -> Gateway "Browse"
  Gateway -> OrderSvc "Create Order"
  OrderSvc -> TaxCalc "Compute"
  OrderSvc -> OrdersDB "Save"
`;

  it("analyzes C4 hierarchical levels accurately", () => {
    const { ast } = parseAndCompile(code);
    const report = analyzeC4Model(ast);

    expect(report.levelsPresent.context).toBe(1);
    expect(report.levelsPresent.container).toBe(3);
    expect(report.levelsPresent.component).toBe(1);
    expect(report.summaryMarkdown).toContain("C4 Architecture Model Hierarchy");
  });

  it("filters C4 hierarchy down to L1 Context ceiling", () => {
    const { ast } = parseAndCompile(code);
    const { filteredAst, visibleNodeIds } = filterC4Hierarchy(ast, "context");

    expect(visibleNodeIds).toEqual(["Customer"]);
    expect(Object.keys(filteredAst.nodes)).toEqual(["Customer"]);
  });

  it("generates a 4-level C4 storyboard progression", () => {
    const { ast } = parseAndCompile(code);
    const storyboard = generateC4Storyboard(ast);

    expect(storyboard).toContain("Level 1: System Context & Actors");
    expect(storyboard).toContain("Level 2: Container Topology & Stores");
    expect(storyboard).toContain("Level 3: Internal Modules & Flow");
  });

  it("detects drift when in-tree files are missing or unmapped services exist", () => {
    const { ast } = parseAndCompile(code);
    const existingRepoFiles = [
      "src/orders/index.ts",
      "src/payments/service.ts", // Unmapped service!
    ];

    const drift = detectArchitectureDrift(ast, existingRepoFiles);

    expect(drift.isSynchronized).toBe(true);
    expect(drift.validAnchorCount).toBe(1);
    expect(drift.orphanCodeServices.length).toBe(1);
    expect(drift.orphanCodeServices[0].suggestedId).toBe("PaymentsSvc");
    expect(drift.healingMarkdySnippet).toContain('service PaymentsSvc "PaymentsSvc" @src="src/payments/service.ts#L1"');
  });

  it("detects broken code anchor drift", () => {
    const { ast } = parseAndCompile(code);
    const existingRepoFiles = [
      "src/other/path.ts", // orders/index.ts is missing!
    ];

    const drift = detectArchitectureDrift(ast, existingRepoFiles);

    expect(drift.isSynchronized).toBe(false);
    expect(drift.brokenAnchors.length).toBe(1);
    expect(drift.brokenAnchors[0].nodeId).toBe("OrderSvc");
    expect(drift.brokenAnchors[0].reason).toBe("file_not_found");
  });

  it("exports isolated MarkdyScript blueprints for all 4 C4 levels", () => {
    const { ast } = parseAndCompile(code);
    const views = exportC4LevelViews(ast);

    expect(views.context.nodeCount).toBe(1);
    expect(views.container.nodeCount).toBe(4);
    expect(views.component.nodeCount).toBe(5);
    expect(views.code.nodeCount).toBe(5);

    expect(views.context.markdyScript).toContain("Customer");
    expect(views.container.markdyScript).toContain("Gateway");
  });

  it("validates C4 containment consistency", () => {
    const { ast } = parseAndCompile(code);
    const validation = validateC4Containment(ast);
    expect(validation.isValid).toBe(true);
    expect(validation.issues.length).toBe(0);
  });

  it("auto-heals broken code provenance anchors using fuzzy path matching", () => {
    const { ast } = parseAndCompile(code);
    const movedRepoFiles = [
      "src/orders/main.ts", // Moved from index.ts to main.ts!
      "src/payments/service.ts", // New unmapped service
    ];

    const drift = detectArchitectureDrift(ast, movedRepoFiles);
    expect(drift.brokenAnchors.length).toBe(1);

    const healed = autoHealArchitectureDrift(ast, drift, movedRepoFiles);
    expect(healed.healedAnchorCount).toBe(1);
    expect(healed.addedServiceCount).toBe(1);
    expect(healed.healedMappings[0].nodeId).toBe("OrderSvc");
    expect(healed.healedMappings[0].newPath).toContain("src/orders/main.ts");
    expect(healed.healedMarkdyScript).toContain("@src=\"src/orders/main.ts#L10\"");
    expect(healed.healedMarkdyScript).toContain('service PaymentsSvc');
  });
});


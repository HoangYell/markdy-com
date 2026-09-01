import { describe, it, expect } from "vitest";
import {
  parseCodeAnchor,
  extractDiagramCodeAnchors,
  verifyCodeAnchorsWithReader,
} from "../src/provenance.js";
import { parse } from "../src/parser.js";

describe("Code Provenance & Verification Engine", () => {
  it("parses valid relative POSIX code anchors with line ranges", () => {
    const anchor = parseCodeAnchor("src/auth/jwt.service.ts#L20-L85");
    expect(anchor).not.toBeNull();
    expect(anchor?.filePath).toBe("src/auth/jwt.service.ts");
    expect(anchor?.startLine).toBe(20);
    expect(anchor?.endLine).toBe(85);
  });

  it("parses single-line code anchors", () => {
    const anchor = parseCodeAnchor("prisma/schema.prisma#L42");
    expect(anchor?.filePath).toBe("prisma/schema.prisma");
    expect(anchor?.startLine).toBe(42);
    expect(anchor?.endLine).toBe(42);
  });

  it("rejects path traversal attempts", () => {
    expect(parseCodeAnchor("../etc/passwd#L1")).toBeNull();
    expect(parseCodeAnchor("/root/secret.key")).toBeNull();
  });

  it("extracts code anchors from parsed Markdy AST", () => {
    const script = `
scene "Secured Topology"
service Auth "Auth Gateway" src="src/auth/index.ts#L10-L50"
database UserDb "Postgres" @src="db/schema.sql#L100"
`;
    const ast = parse(script);
    const anchors = extractDiagramCodeAnchors(ast);

    expect(anchors.size).toBe(2);
    expect(anchors.get("Auth")?.filePath).toBe("src/auth/index.ts");
    expect(anchors.get("UserDb")?.filePath).toBe("db/schema.sql");
  });

  it("verifies code anchors with simulated file reader", () => {
    const anchors = new Map([
      ["Auth", parseCodeAnchor("src/auth.ts#L10-L20")!],
      ["Db", parseCodeAnchor("src/missing.ts#L5")!],
      ["Cache", parseCodeAnchor("src/redis.ts#L999")!],
    ]);

    const fakeFiles: Record<string, number> = {
      "src/auth.ts": 100,
      "src/redis.ts": 50,
    };

    const report = verifyCodeAnchorsWithReader(anchors, {
      fileExists: (p) => p in fakeFiles,
      getLineCount: (p) => fakeFiles[p] || 0,
    });

    expect(report.isValid).toBe(false);
    expect(report.verifiedCount).toBe(1);
    expect(report.diagnostics.length).toBe(2);
    expect(report.diagnostics.find((d) => d.code === "provenance/file-not-found")?.nodeId).toBe("Db");
    expect(report.diagnostics.find((d) => d.code === "provenance/line-out-of-bounds")?.nodeId).toBe("Cache");
  });
});

import { describe, it, expect } from "vitest";
import { parseAndCompile } from "@markdy/core";

const SAMPLE = `
scene "Test" theme=midnight
browser Web
service API

beat main:
  show $nodes
  Web -> API "ping"
`;

describe("diagram render plan", () => {
  it("compiles cues for playback", () => {
    const { plan } = parseAndCompile(SAMPLE);
    expect(plan.nodes).toHaveLength(2);
    expect(plan.cues.length).toBeGreaterThan(0);
    expect(plan.theme.name).toBe("midnight");
  });
});

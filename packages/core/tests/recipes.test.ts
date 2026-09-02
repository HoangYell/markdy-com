import { describe, it, expect } from "vitest";
import {
  recommendArchitecturePattern,
  synthesizeCustomRecipe,
  getArchitectureRecipe,
  listArchitectureRecipes,
  ARCHITECTURE_RECIPES,
} from "../src/recipes.js";
import { parseAndCompile } from "../src/parser.js";

describe("Architecture Pattern Recipes & Recommender", () => {
  it("lists all canonical architecture recipes", () => {
    const recipes = listArchitectureRecipes();
    expect(recipes.length).toBeGreaterThanOrEqual(10);
    expect(recipes.map((r) => r.id)).toContain("cache-aside");
    expect(recipes.map((r) => r.id)).toContain("event-driven-eda");
    expect(recipes.map((r) => r.id)).toContain("zero-trust-security");
    expect(recipes.map((r) => r.id)).toContain("agentic-react-tools");
  });

  it("retrieves a recipe by exact ID", () => {
    const recipe = getArchitectureRecipe("cache-aside");
    expect(recipe).toBeDefined();
    expect(recipe?.name).toContain("Cache-Aside");
    expect(recipe?.category).toBe("caching");
  });

  it("recommends architecture patterns from user query tokens", () => {
    const recs = recommendArchitecturePattern("We need an event streaming pipeline with Kafka and CDC");
    expect(recs.length).toBeGreaterThan(0);
    expect(recs[0].recipe.id).toBe("event-driven-eda");
    expect(recs[0].matchedKeywords).toContain("kafka");
  });

  it("recommends security enclave patterns for zero trust queries", () => {
    const recs = recommendArchitecturePattern("Design a zero trust security perimeter with OPA and Vault");
    expect(recs.length).toBeGreaterThan(0);
    expect(recs[0].recipe.id).toBe("zero-trust-security");
  });

  it("synthesizes a tailored MarkdyScript diagram dynamically from custom user requirements", () => {
    const query = "Next.js frontend with Stripe payment gateway, Redis caching, and PostgreSQL database";
    const res = synthesizeCustomRecipe(query);
    expect(res.detectedComponents.length).toBeGreaterThanOrEqual(4);
    expect(res.detectedComponents.map((c) => c.id)).toContain("NextApp");
    expect(res.detectedComponents.map((c) => c.id)).toContain("StripeGateway");
    expect(res.detectedComponents.map((c) => c.id)).toContain("RedisCache");
    expect(res.detectedComponents.map((c) => c.id)).toContain("PostgresDB");

    const { ast } = parseAndCompile(res.markdyScript);
    expect(Object.keys(ast.nodes).length).toBeGreaterThanOrEqual(4);
    expect(ast.diagnostics.filter((d) => d.severity === "error").length).toBe(0);
  });

  it("ensures all 14 recipe MarkdyScript templates compile cleanly without parse errors", () => {
    expect(ARCHITECTURE_RECIPES.length).toBeGreaterThanOrEqual(14);
    for (const recipe of ARCHITECTURE_RECIPES) {
      const { ast } = parseAndCompile(recipe.code);
      expect(Object.keys(ast.nodes).length, `Recipe ${recipe.id} nodes`).toBeGreaterThan(0);
      expect(ast.beats.length, `Recipe ${recipe.id} beats`).toBeGreaterThan(0);
      expect(ast.diagnostics.filter((d) => d.severity === "error").length).toBe(0);
    }
  });
});


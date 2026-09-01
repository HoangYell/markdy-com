/**
 * packages/core/src/symbols.ts
 * Native Zero-Dependency Vector Symbol Registry for Markdy.
 * High-performance inline SVG paths for modern system architecture stacks.
 */

export interface VectorSymbol {
  name: string;
  category: "cloud" | "database" | "compute" | "messaging" | "runtime" | "gateway";
  viewBox: string;
  svgPaths: string;
  brandColor?: string;
}

export const VECTOR_SYMBOLS: Record<string, VectorSymbol> = {
  // Cloud & Infrastructure
  aws: {
    name: "AWS",
    category: "cloud",
    viewBox: "0 0 24 24",
    svgPaths: `<path fill="currentColor" d="M12 2L2 7l10 5 10-5-10-5zm0 8.5L4.5 7 12 3.25 19.5 7 12 10.5zM2 17l10 5 10-5M2 12l10 5 10-5"/>`,
    brandColor: "#FF9900",
  },
  gcp: {
    name: "Google Cloud",
    category: "cloud",
    viewBox: "0 0 24 24",
    svgPaths: `<path fill="currentColor" d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM19 18H6c-2.21 0-4-1.79-4-4 0-2.05 1.53-3.76 3.56-3.97l1.07-.11.5-.95C8.08 7.14 9.94 6 12 6c2.62 0 4.88 1.86 5.39 4.43l.3 1.5 1.53.11c1.56.1 2.78 1.41 2.78 2.96 0 1.65-1.35 3-3 3z"/>`,
    brandColor: "#4285F4",
  },
  azure: {
    name: "Microsoft Azure",
    category: "cloud",
    viewBox: "0 0 24 24",
    svgPaths: `<path fill="currentColor" d="M13.05 4.24l-6.1 11.23L2 17.52l7.73-14.28 3.32 1zm1.09 1.94L18.42 16h-7.8l-1.92 3.76H22l-7.86-13.58z"/>`,
    brandColor: "#0089D6",
  },
  kubernetes: {
    name: "Kubernetes",
    category: "compute",
    viewBox: "0 0 24 24",
    svgPaths: `<path fill="currentColor" d="M12 2l8.66 5v10L12 22l-8.66-5V7L12 2zm0 2.31L5.34 7.69v7.62L12 18.69l6.66-3.38V7.69L12 4.31zm0 3.69a4 4 0 1 1 0 8 4 4 0 0 1 0-8z"/>`,
    brandColor: "#326CE5",
  },
  docker: {
    name: "Docker",
    category: "compute",
    viewBox: "0 0 24 24",
    svgPaths: `<path fill="currentColor" d="M13.98 11.08h1.83V9.25h-1.83v1.83zm-2.75 0h1.83V9.25h-1.83v1.83zm-2.75 0h1.83V9.25H8.48v1.83zm-2.75 0h1.83V9.25H5.73v1.83zm8.25-2.75h1.83V6.5h-1.83v1.83zm-2.75 0h1.83V6.5h-1.83v1.83zm-2.75 0h1.83V6.5H8.48v1.83zm8.25 0h1.83V6.5h-1.83v1.83zm1.83 5.5c-.4 0-.8.1-1.1.3-.8-1.5-2.4-2.5-4.3-2.5H2.4c-.2.7-.4 1.4-.4 2.2 0 4.4 3.6 8 8 8 5 0 9.2-3.6 9.9-8.4.8.1 1.6-.2 2.1-.8.4-.5.5-1.2.3-1.8-.7.7-1.5 1-2.3 1z"/>`,
    brandColor: "#2496ED",
  },
  cloudflare: {
    name: "Cloudflare",
    category: "cloud",
    viewBox: "0 0 24 24",
    svgPaths: `<path fill="currentColor" d="M18.42 10.36A6.5 6.5 0 0 0 7.2 9.04 4.5 4.5 0 0 0 3 13.5a4.5 4.5 0 0 0 4.5 4.5h11a3.5 3.5 0 0 0 .92-6.88v-.76z"/>`,
    brandColor: "#F38020",
  },

  // Databases & Stores
  postgresql: {
    name: "PostgreSQL",
    category: "database",
    viewBox: "0 0 24 24",
    svgPaths: `<path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.4z"/>`,
    brandColor: "#336791",
  },
  mysql: {
    name: "MySQL",
    category: "database",
    viewBox: "0 0 24 24",
    svgPaths: `<path fill="currentColor" d="M12 3c-4.97 0-9 1.79-9 4v10c0 2.21 4.03 4 9 4s9-1.79 9-4V7c0-2.21-4.03-4-9-4zm0 2c4.41 0 7 1.43 7 2s-2.59 2-7 2-7-1.43-7-2 2.59-2 7-2zm0 14c-4.41 0-7-1.43-7-2v-1.82c1.78 1.11 4.29 1.82 7 1.82s5.22-.71 7-1.82V17c0 .57-2.59 2-7 2zm0-5c-4.41 0-7-1.43-7-2v-1.82c1.78 1.11 4.29 1.82 7 1.82s5.22-.71 7-1.82V12c0 .57-2.59 2-7 2z"/>`,
    brandColor: "#4479A1",
  },
  redis: {
    name: "Redis",
    category: "database",
    viewBox: "0 0 24 24",
    svgPaths: `<path fill="currentColor" d="M12 2L2 7.5l10 5.5 10-5.5L12 2zm-8 8.7V17L12 22.5V16L4 10.7zm16 0L12 16v6.5l8-5.5v-6.3z"/>`,
    brandColor: "#DC382D",
  },
  mongodb: {
    name: "MongoDB",
    category: "database",
    viewBox: "0 0 24 24",
    svgPaths: `<path fill="currentColor" d="M12 2C11.5 3.5 7 10.5 7 15c0 3.5 2.5 6 5 7 2.5-1 5-3.5 5-7 0-4.5-4.5-11.5-5-13zm0 17.5c-1.5-.7-3-2.5-3-4.5 0-2.8 2.2-7 3-9 0.8 2 3 6.2 3 9 0 2-1.5 3.8-3 4.5z"/>`,
    brandColor: "#47A248",
  },
  kafka: {
    name: "Apache Kafka",
    category: "messaging",
    viewBox: "0 0 24 24",
    svgPaths: `<path fill="currentColor" d="M12 3a9 9 0 1 0 9 9 9 9 0 0 0-9-9zm0 16a7 7 0 1 1 7-7 7 7 0 0 1-7 7zm-3-8a2 2 0 1 0-2-2 2 2 0 0 0 2 2zm6 0a2 2 0 1 0-2-2 2 2 0 0 0 2 2zm-3 6a2 2 0 1 0-2-2 2 2 0 0 0 2 2z"/>`,
    brandColor: "#231F20",
  },
  rabbitmq: {
    name: "RabbitMQ",
    category: "messaging",
    viewBox: "0 0 24 24",
    svgPaths: `<path fill="currentColor" d="M12 2a5 5 0 0 0-5 5v1H5a3 3 0 0 0-3 3v7a4 4 0 0 0 4 4h12a4 4 0 0 0 4-4v-7a3 3 0 0 0-3-3h-2V7a5 5 0 0 0-5-5zm-3 6a3 3 0 0 1 6 0v1H9V8zm-3 5h2v2H6v-2zm12 0h2v2h-2v-2z"/>`,
    brandColor: "#FF6600",
  },
  elasticsearch: {
    name: "Elasticsearch",
    category: "database",
    viewBox: "0 0 24 24",
    svgPaths: `<path fill="currentColor" d="M12 2A10 10 0 1 0 22 12 10 10 0 0 0 12 2zm-1 3.1a6.9 6.9 0 0 1 5.5 2.9h-11A6.9 6.9 0 0 1 11 5.1zM5.1 12c0-.7.1-1.3.3-2h13.2c.2.7.3 1.3.3 2s-.1 1.3-.3 2H5.4c-.2-.7-.3-1.3-.3-2zm5.9 6.9a6.9 6.9 0 0 1-5.5-2.9h11a6.9 6.9 0 0 1-5.5 2.9z"/>`,
    brandColor: "#005571",
  },

  // Compute, Gateway & Runtimes
  nodejs: {
    name: "Node.js",
    category: "runtime",
    viewBox: "0 0 24 24",
    svgPaths: `<path fill="currentColor" d="M12 2L3.5 7v10L12 22l8.5-5V7L12 2zm6.5 13.7L12 19.5l-6.5-3.8V8.3L12 4.5l6.5 3.8v7.4z"/>`,
    brandColor: "#339933",
  },
  python: {
    name: "Python",
    category: "runtime",
    viewBox: "0 0 24 24",
    svgPaths: `<path fill="currentColor" d="M11.9 2c-3.1 0-4.9.4-4.9 2.2V6h5v1.5H5.8C3.7 7.5 2 9.2 2 11.3c0 2.2 1.4 3.7 3.8 3.7h1.4v-1.9c0-1.8 1.6-3.3 3.5-3.3h5.2V7.7C15.9 4.1 14.8 2 11.9 2zM9 4.2a.8.8 0 1 1 0 1.6.8.8 0 0 1 0-1.6zm3.1 17.8c3.1 0 4.9-.4 4.9-2.2V18h-5v-1.5h6.2c2.1 0 3.8-1.7 3.8-3.8 0-2.2-1.4-3.7-3.8-3.7h-1.4v1.9c0 1.8-1.6 3.3-3.5 3.3H8.6v2.1c0 3.6 1.1 5.7 4.5 5.7zM15 18.2a.8.8 0 1 1 0 1.6.8.8 0 0 1 0-1.6z"/>`,
    brandColor: "#3776AB",
  },
  golang: {
    name: "Go",
    category: "runtime",
    viewBox: "0 0 24 24",
    svgPaths: `<path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4 11h-3v2h3v2h-5v-6h5v2zm-7-2H7v-2h2v2z"/>`,
    brandColor: "#00ADD8",
  },
  rust: {
    name: "Rust",
    category: "runtime",
    viewBox: "0 0 24 24",
    svgPaths: `<path fill="currentColor" d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm1 14.5l-2-3h-1v3H8V7.5h4a3 3 0 0 1 3 3 3 3 0 0 1-2 2.8l2 3.2zm-1-6.5h-2v2h2a1 1 0 0 0 1-1 1 1 0 0 0-1-1z"/>`,
    brandColor: "#DEA584",
  },
  nginx: {
    name: "Nginx",
    category: "gateway",
    viewBox: "0 0 24 24",
    svgPaths: `<path fill="currentColor" d="M12 2L2 7.8v8.4L12 22l10-5.8V7.8L12 2zm-4 13.5V8.5l3 3.5v3.5l-3-3.5zm8 0l-3-3.5V8.5l3 3.5v3.5z"/>`,
    brandColor: "#009639",
  },
  graphql: {
    name: "GraphQL",
    category: "gateway",
    viewBox: "0 0 24 24",
    svgPaths: `<path fill="currentColor" d="M12 2l8.66 5v10L12 22l-8.66-5V7L12 2zm0 2.4L5.5 8.1v7.8L12 19.6l6.5-3.7V8.1L12 4.4zM12 7a2 2 0 1 1 0 4 2 2 0 0 1 0-4zm0 6a2 2 0 1 1 0 4 2 2 0 0 1 0-4z"/>`,
    brandColor: "#E10098",
  },
};

/**
 * Resolves a vector symbol definition by key or normalized alias.
 */
export function resolveVectorSymbol(nameOrAlias: string): VectorSymbol | null {
  if (!nameOrAlias || typeof nameOrAlias !== "string") return null;
  const key = nameOrAlias.trim().toLowerCase().replace(/[\s_.-]+/g, "");
  
  if (VECTOR_SYMBOLS[key]) return VECTOR_SYMBOLS[key];

  const aliases: Record<string, string> = {
    postgres: "postgresql",
    pg: "postgresql",
    k8s: "kubernetes",
    kube: "kubernetes",
    cf: "cloudflare",
    node: "nodejs",
    py: "python",
    go: "golang",
    elastic: "elasticsearch",
    es: "elasticsearch",
    rabbit: "rabbitmq",
    mq: "rabbitmq",
  };

  const target = aliases[key];
  return target ? VECTOR_SYMBOLS[target] || null : null;
}

/**
 * Returns a standalone SVG snippet string for a vector symbol.
 */
export function renderSymbolSvg(
  symbol: VectorSymbol | string,
  options?: { size?: number; className?: string; color?: string }
): string | null {
  const resolved = typeof symbol === "string" ? resolveVectorSymbol(symbol) : symbol;
  if (!resolved) return null;

  const size = options?.size ?? 18;
  const className = options?.className ? ` class="${options.className}"` : "";
  const style = options?.color ? ` style="color: ${options.color}"` : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${resolved.viewBox}" width="${size}" height="${size}"${className}${style} aria-hidden="true">${resolved.svgPaths}</svg>`;
}

export function listAvailableSymbols(): string[] {
  return Object.keys(VECTOR_SYMBOLS);
}

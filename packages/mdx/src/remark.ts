import type { Code, Root } from "mdast";
import { visit } from "unist-util-visit";

type MetaValue = string | number | boolean;

type MdxAttribute = {
  type: "mdxJsxAttribute";
  name: string;
  value?: string;
};

type MdxJsxFlowElement = {
  type: "mdxJsxFlowElement";
  name: string;
  attributes: MdxAttribute[];
  children: [];
};

type MarkdyFenceDefaults = Partial<{
  width: number;
  height: number;
  bg: string;
  autoplay: boolean;
  loop: boolean;
  copyright: boolean;
  progressBar: boolean;
  title: string;
  description: string;
}>;

export type RemarkMarkdyOptions = {
  componentName?: string;
  defaults?: MarkdyFenceDefaults;
};

const MARKDY_LANGS = new Set(["markdy", "markdyscript"]);
const META_TOKEN_RE = /([A-Za-z_]\w*)=("[^"]*"|'[^']*'|[^\s]+)/g;

function parseMetaValue(raw: string): MetaValue {
  if (raw === "true") return true;
  if (raw === "false") return false;
  if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) {
    return raw.slice(1, -1);
  }
  const asNumber = Number(raw);
  if (!Number.isNaN(asNumber)) return asNumber;
  return raw;
}

function normalizeMetaKey(key: string): string {
  if (key === "progress_bar") return "progressBar";
  return key;
}

function parseMeta(meta: string | null | undefined): Record<string, MetaValue> {
  if (!meta) return {};
  const out: Record<string, MetaValue> = {};
  for (const match of meta.matchAll(META_TOKEN_RE)) {
    const key = normalizeMetaKey(match[1]);
    out[key] = parseMetaValue(match[2]);
  }
  return out;
}

function toAttribute(name: string, value: MetaValue): MdxAttribute {
  return {
    type: "mdxJsxAttribute",
    name,
    value: String(value),
  };
}

function toCodeAttribute(code: string): MdxAttribute {
  return {
    type: "mdxJsxAttribute",
    name: "code",
    value: code,
  };
}

export function remarkMarkdy(opts: RemarkMarkdyOptions = {}) {
  const componentName = opts.componentName ?? "MarkdyPlayer";
  const defaultProps: MarkdyFenceDefaults = {
    autoplay: false,
    loop: false,
    progressBar: false,
    ...opts.defaults,
  };

  return (tree: Root): void => {
    visit(tree, "code", (node, index, parent) => {
      if (index === undefined || !parent) return;
      const codeNode = node as Code;
      const lang = codeNode.lang?.toLowerCase() ?? "";
      if (!MARKDY_LANGS.has(lang)) return;

      const parsedMeta = parseMeta(codeNode.meta);
      const mergedProps: Record<string, MetaValue> = {
        ...defaultProps,
        ...parsedMeta,
      };

      const attributes: MdxAttribute[] = [toCodeAttribute(codeNode.value)];
      for (const [key, value] of Object.entries(mergedProps)) {
        if (value === undefined) continue;
        attributes.push(toAttribute(key, value));
      }

      const replacement: MdxJsxFlowElement = {
        type: "mdxJsxFlowElement",
        name: componentName,
        attributes,
        children: [],
      };

      parent.children[index] = replacement as unknown as Root["children"][number];
    });
  };
}

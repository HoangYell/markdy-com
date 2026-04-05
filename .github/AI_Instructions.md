# **Build Markdy.com (MarkdyScript) from Scratch**

You are a senior open-source TypeScript library engineer.

Build **Markdy.com**, an open-source animation DSL engine for blog posts, similar to Mermaid but for simple motion scenes.

The DSL name is **MarkdyScript**.

The file extension is **.markdy**.

The Markdown code fence language is **\`\`\`markdy**.

This project must be AI-friendly, deterministic, lightweight, and easy to embed into Astro/MDX.

No em-dashes. No marketing fluff. Be direct and implementation-focused. Write all files fully without leaving TODO placeholders for the requested scope.

## **1\. GOAL**

MarkdyScript allows users to write:

scene width=800 height=400 fps=30 bg=white

asset pepe \= image("/memes/pepe.webp")  
asset cat  \= image("/memes/cat.png")  
asset fire \= icon("lucide:flame")

actor p \= sprite(pepe) at (100,250) scale 0.4  
actor c \= sprite(cat) at (600,250) scale 0.4  
actor title \= text("Ship it") at (320,80) size 48

@0.0: p.enter(from=left, dur=0.8)  
@1.0: p.say("bruh", dur=1.0)  
@2.0: p.move(to=(300,250), dur=1.0, ease=inout)  
@3.0: p.throw(fire, to=c, dur=0.8)  
@4.0: c.shake(intensity=3, dur=0.5)  
@4.6: c.fade\_out(dur=0.4)  
@5.2: title.fade\_in(dur=0.5)

This must render as an animated scene inside a container, embeddable inside Markdown and MDX.

## **2\. DESIGN PRINCIPLES**

* Syntax is line-based, minimal, strict, and deterministic.  
* Primary timeline primitive: @time: actor.action(params)  
* Comments start with \#. Blank lines and arbitrary whitespace between tokens are ignored.  
* Parser must provide useful errors with line numbers.  
* No React, GSAP, or Rough.js dependencies in core.  
* Use Web Animations API and requestAnimationFrame.  
* Rendering uses HTML DOM nodes (with optional SVG) and CSS transforms.  
* Use tsup for building the library packages and vitest for parser testing.

## **3\. MONOREPO REQUIREMENTS (pnpm workspace)**

Use pnpm workspaces. Repo structure:

markdy/  
  packages/  
    core/  
      src/ (ast.ts, parser.ts, index.ts)  
      tests/ (parser.test.ts)  
      package.json (use tsup for build)  
      tsconfig.json

    renderer-dom/  
      src/ (renderer.ts, index.ts)  
      package.json (use tsup for build)  
      tsconfig.json

    astro/  
      src/ (Markdy.astro, index.ts)  
      package.json  
      tsconfig.json

  website/  
    src/  
    public/memes/

  package.json (root)  
  pnpm-workspace.yaml  
  tsconfig.base.json

## **4\. PACKAGE RESPONSIBILITIES**

* **@markdy/core:** AST types, strict regex-based parser, timeline math. Zero DOM dependencies.  
* **@markdy/renderer-dom:** Translates AST to DOM nodes. Executes Web Animations API.  
* **@markdy/astro:** Provides \<Markdy client:visible /\> component. Handles SSR placeholder dimensions.

## **5\. DSL SPEC (MVP)**

* **Scene:** scene width=800 height=400 fps=30 bg=white (Defaults: 800x400, 30fps, white bg. duration auto-computed if missing).  
* **Asset:** asset \[name\] \= \[image|icon\]("\[path\]")  
* **Actor:** actor \[name\] \= \[sprite|text|box\](\[args\]) at (x,y) \[scale/rotate/opacity\]  
* **Events:** @time: actorName.action(params)

## **6\. ACTIONS TO IMPLEMENT (MVP)**

* move(to=(x,y), dur=sec, ease=linear|in|out|inout)  
* enter(from=left|right|top|bottom, dur=sec)  
* fade\_in(dur=sec) / fade\_out(dur=sec)  
* scale(to=val, dur=sec) / rotate(to=deg, dur=sec)  
* shake(intensity=val, dur=sec)  
* say("text", dur=sec) (speech bubble)  
* throw(assetName, to=actorName, dur=sec)

## **7\. AST FORMAT & RUNTIME API**

**Parser output MUST follow:**

export type SceneAST \= {  
  meta: { width: number; height: number; fps: number; bg: string; duration?: number; };  
  assets: Record\<string, { type: "image" | "icon"; value: string }\>;  
  actors: Record\<string, ActorDef\>; // Includes type, x, y, scale, rotate, opacity  
  events: TimelineEvent\[\]; // time, actor, action, params (Record\<string, unknown\>), line  
};

**Renderer API MUST follow:**

export function createPlayer(opts: { container: HTMLElement; code: string; assets?: Record\<string, string\>; autoplay?: boolean; }): { play(): void; pause(): void; seek(seconds: number): void; destroy(): void; };

## **8\. EXECUTION PROTOCOL (CRITICAL)**

To avoid token limits, you must generate this project in strict stages.

**Wait for my confirmation before moving to the next stage.**

* **STAGE 1:** Output the root config files (pnpm-workspace.yaml, package.json, tsconfig.base.json) AND the complete @markdy/core package (AST, parser, and Vitest test file).  
* **STAGE 2:** Output the complete @markdy/renderer-dom package.  
* **STAGE 3:** Output the @markdy/astro integration and the website application.  
* **STAGE 4:** Output docs/SYNTAX.md and the root README.md.

Please acknowledge these instructions and execute **STAGE 1** now.
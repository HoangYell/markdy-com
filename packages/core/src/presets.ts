/**
 * MarkdyScript built-in presets.
 *
 * A preset is a string template that expands at parse time into canonical
 * MarkdyScript. The renderer never sees preset statements — by the time
 * parsing reaches the actor/event stage, the preset has been replaced
 * with its expansion.
 *
 * Design rules:
 *   1. Each preset is self-contained — it declares its own `scene`,
 *      actors, and timeline.
 *   2. Presets are short. The value is in `preset <name>` being a
 *      one-liner that expands to a scaffold the user can then tweak.
 *   3. Presets share a common visual grammar so a feed of them feels
 *      like a family, not a collage.
 */

export type PresetFn = (args: string[]) => string;

function quote(s: string): string {
  const stripped = s.replace(/^"|"$/g, "");
  return `"${stripped.replace(/"/g, '\\"')}"`;
}

export const PRESETS: Record<string, PresetFn> = {
  meme: (args) => {
    const top = quote(args[0] ?? "when the code works");
    const bottom = quote(args[1] ?? "and you don't know why");
    return `scene width=720 height=720 bg=#111

actor top    = caption(${top}) at top
actor hero   = figure(#c68642, m, 😎) at (360, 430)
actor bottom = caption(${bottom}) at bottom

@0.0: top.fade_in(dur=0.4)
@0.4: hero.enter(from=bottom, dur=0.6)
@1.2: hero.face("😂")
@1.8: bottom.fade_in(dur=0.4)
@3.2: hero.bounce(intensity=20, count=2, dur=0.8)
`;
  },

  explainer: (args) => {
    const title = quote(args[0] ?? "how it works");
    return `scene width=960 height=540 bg=#0d1117

actor title = caption(${title}) at top
actor hero  = figure(#c68642, m, 😎) at (480, 360)

scene "intro" {
  @+0.0: title.fade_in(dur=0.5)
  @+1.0: hero.enter(from=bottom, dur=0.5)
}

scene "body" {
  @+0.0: camera.zoom(to=1.2, dur=0.8)
  @+1.0: hero.wave(side=right, dur=0.5)
}
`;
  },

  reaction: (args) => {
    const line = quote(args[0] ?? "wait, what?");
    return `scene width=720 height=720 bg=#fff5f9

actor hero = figure(#c68642, m, 🙂) at (360, 380)

@0.0: hero.enter(from=left, dur=0.4)
@0.5: hero.face("😳")
@0.5: hero.say(${line}, dur=1.4)
@2.0: hero.face("😂")
@2.0: hero.shake(intensity=6, dur=0.5)
`;
  },

  pov: (args) => {
    const pov = quote(args[0] ?? "POV: you hit ship");
    return `scene width=720 height=960 bg=#0d1117

actor label = caption(${pov}) at top
actor hero  = figure(#c68642, m, 😎) at (360, 600)

@0.0: label.fade_in(dur=0.4)
@0.4: hero.enter(from=bottom, dur=0.6)
@1.2: hero.pose(arm_left=70, arm_right=-70, dur=0.3)
@1.2: hero.face("🔥")
`;
  },

  typing: (args) => {
    const text = quote(args[0] ?? "hello world");
    return `scene width=800 height=300 bg=#0f1115

actor cursor = text("|") at (120, 150) size 40
actor line   = text(${text}) at (140, 150) size 32 opacity 0

@0.0: line.fade_in(dur=0.8)
@1.2: cursor.fade_out(dur=0.3)
`;
  },

  terminal: (args) => {
    const cmd = quote(args[0] ?? "$ npx markdy");
    const output = quote(args[1] ?? "playground ready at http://localhost:4242");
    return `scene width=960 height=420 bg=#0d1117

actor prompt = text(${cmd})    at (60, 140) size 24 opacity 0
actor result = text(${output}) at (60, 200) size 22 opacity 0

@0.0: prompt.fade_in(dur=0.4)
@1.0: result.fade_in(dur=0.4)
`;
  },

  chat_bubble: (args) => {
    const a = quote(args[0] ?? "how do I animate this?");
    const b = quote(args[1] ?? "ask markdy.");
    return `scene width=800 height=400 bg=#f6f7fb

actor alice = figure(#fad4c0, f, 🙂) at (180, 240)
actor bob   = figure(#c68642, m, 🙂) at (620, 240)

@0.0: alice.enter(from=left, dur=0.4)
@0.2: bob.enter(from=right, dur=0.4)
@0.8: alice.say(${a}, dur=1.8)
@2.6: bob.face("😎")
@2.6: bob.say(${b}, dur=1.6)
`;
  },

  vs: (args) => {
    const left = quote(args[0] ?? "v1");
    const right = quote(args[1] ?? "v2");
    return `scene width=960 height=540 bg=#111

actor a = caption(${left})  at top
actor b = caption(${right}) at bottom
actor lf = figure(#c68642, m, 😤) at (260, 320)
actor rf = figure(#8d5524, m, 😏) at (700, 320)

@0.0: a.fade_in(dur=0.3)
@0.0: b.fade_in(dur=0.3)
@0.3: lf.enter(from=left, dur=0.5)
@0.3: rf.enter(from=right, dur=0.5)
@1.2: lf.punch(side=right, dur=0.3)
@1.3: rf.shake(intensity=8, dur=0.4)
`;
  },

  tutorial_step: (args) => {
    const n = quote(args[0] ?? "Step 1");
    const body = quote(args[1] ?? "open your editor");
    return `scene width=960 height=420 bg=white

actor step  = caption(${n}) at top
actor descr = text(${body}) at (100, 220) size 32 opacity 0

@0.0: step.fade_in(dur=0.4)
@0.5: descr.fade_in(dur=0.4)
@1.2: descr.move(to=(120, 220), dur=0.5, ease=out)
`;
  },

  countdown: (args) => {
    const to = quote(args[0] ?? "launch");
    return `scene width=600 height=600 bg=#0d1117

actor three = text("3") at (270, 280) size 120 opacity 0
actor two   = text("2") at (270, 280) size 120 opacity 0
actor one   = text("1") at (270, 280) size 120 opacity 0
actor go    = caption(${to}) at center

@0.0: three.fade_in(dur=0.2)
@0.9: three.fade_out(dur=0.2)
@0.9: two.fade_in(dur=0.2)
@1.8: two.fade_out(dur=0.2)
@1.8: one.fade_in(dur=0.2)
@2.7: one.fade_out(dur=0.2)
@2.7: go.fade_in(dur=0.4)
`;
  },

  reveal: (args) => {
    const secret = quote(args[0] ?? "and that's the trick");
    return `scene width=800 height=450 bg=#0d1117

actor cover  = box() at (350, 175) scale 3 opacity 1
actor reveal = caption(${secret}) at center

@0.4: cover.fade_out(dur=0.5)
@0.4: reveal.fade_in(dur=0.5)
`;
  },

  glitch: (_args) => {
    const txt = quote("GLITCH");
    return `scene width=800 height=400 bg=#000

actor t = text(${txt}) at (260, 170) size 72

@0.0: t.fade_in(dur=0.2)
@0.4: t.shake(intensity=10, dur=0.3)
@0.8: t.shake(intensity=6, dur=0.3)
@1.3: t.fade_out(dur=0.3)
`;
  },

  zoom_punchline: (args) => {
    const line = quote(args[0] ?? "the punchline");
    return `scene width=800 height=450 bg=#0d1117

actor line = caption(${line}) at center

@0.0: line.fade_in(dur=0.4)
@0.6: camera.zoom(to=1.4, dur=0.8, ease=out)
@1.6: camera.shake(intensity=6, dur=0.4)
`;
  },

  before_after: (args) => {
    const before = quote(args[0] ?? "before");
    const after = quote(args[1] ?? "after");
    return `scene width=960 height=420 bg=#f6f7fb

actor a    = caption(${before}) at top
actor b    = caption(${after})  at bottom
actor dude = figure(#c68642, m, 😵) at (480, 240)

@0.0: a.fade_in(dur=0.3)
@0.0: dude.enter(from=left, dur=0.5)
@1.4: dude.face("😎")
@1.4: b.fade_in(dur=0.3)
`;
  },

  tier_list: (_args) => {
    return `scene width=960 height=540 bg=#111

actor s     = text("S") at (60, 90)  size 72 opacity 0
actor a     = text("A") at (60, 200) size 72 opacity 0
actor b     = text("B") at (60, 310) size 72 opacity 0
actor c     = text("C") at (60, 420) size 72 opacity 0
actor title = caption("tier list") at top

@0.0: title.fade_in(dur=0.3)
@0.3: s.fade_in(dur=0.2)
@0.6: a.fade_in(dur=0.2)
@0.9: b.fade_in(dur=0.2)
@1.2: c.fade_in(dur=0.2)
`;
  },
};

export const PRESET_NAMES: readonly string[] = Object.keys(PRESETS);

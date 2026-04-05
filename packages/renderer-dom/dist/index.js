// src/renderer.ts
import { parse } from "@markdy/core";
var EASE_MAP = {
  linear: "linear",
  in: "ease-in",
  out: "ease-out",
  inout: "ease-in-out"
};
function toEasing(val) {
  return EASE_MAP[String(val ?? "")] ?? "linear";
}
function stateFrom(def) {
  return {
    x: def.x,
    y: def.y,
    scale: def.scale ?? 1,
    rotate: def.rotate ?? 0,
    opacity: def.opacity ?? 1
  };
}
function tx(s) {
  return `translate(${s.x}px, ${s.y}px) scale(${s.scale}) rotate(${s.rotate}deg)`;
}
function createFigureEl(def) {
  const skinColor = def.args[0] || "#ffdbac";
  const isFemale = def.args[1] === "f";
  const startFace = def.args[2] || (isFemale ? "\u{1F642}" : "\u{1F636}");
  const ink = "#2a2a2a";
  const WRAP_W = 80;
  const FACE_FS = 40;
  const SHIRT_FS = isFemale ? 48 : 44;
  const vShirtW = SHIRT_FS * 0.9;
  const shLx = (WRAP_W - vShirtW) / 2 + vShirtW * 0.18;
  const shRx = WRAP_W - shLx;
  const shY = Math.round(SHIRT_FS * 0.28);
  const ARM_W = 36, ARM_H = 22;
  const LEG_H = 54, LEG_STICK_H = 34;
  const wrap = document.createElement("div");
  Object.assign(wrap.style, {
    position: "relative",
    // allows children of shirtRow to use absolute pos
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    width: `${WRAP_W}px`,
    overflow: "visible"
  });
  const faceEl = document.createElement("span");
  faceEl.dataset.figFace = "";
  faceEl.dataset.figHead = "";
  faceEl.textContent = startFace;
  Object.assign(faceEl.style, {
    fontSize: `${FACE_FS}px`,
    lineHeight: "1",
    flexShrink: "0",
    userSelect: "none",
    pointerEvents: "none",
    zIndex: "5"
  });
  const neck = document.createElement("div");
  Object.assign(neck.style, {
    width: "8px",
    height: "8px",
    background: skinColor,
    borderRadius: "3px",
    flexShrink: "0",
    marginTop: "-2px",
    marginBottom: "-2px",
    zIndex: "4"
  });
  const shirtRow = document.createElement("div");
  Object.assign(shirtRow.style, {
    position: "relative",
    // arms use absolute inside this
    width: `${WRAP_W}px`,
    height: `${SHIRT_FS}px`,
    textAlign: "center",
    flexShrink: "0",
    zIndex: "2",
    overflow: "visible"
  });
  const torso = document.createElement("span");
  torso.dataset.figBody = "";
  torso.textContent = isFemale ? "\u{1F457}" : "\u{1F455}";
  Object.assign(torso.style, {
    fontSize: `${SHIRT_FS}px`,
    lineHeight: "1",
    userSelect: "none",
    pointerEvents: "none"
  });
  shirtRow.appendChild(torso);
  const armL = document.createElement("div");
  armL.dataset.figArmL = "";
  Object.assign(armL.style, {
    position: "absolute",
    width: `${ARM_W}px`,
    height: `${ARM_H}px`,
    right: `${WRAP_W - shLx}px`,
    // right edge at shLx
    top: `${shY - ARM_H / 2}px`,
    transformOrigin: "right center",
    transform: "rotate(20deg)",
    zIndex: "4",
    overflow: "visible"
  });
  const armLStick = document.createElement("div");
  Object.assign(armLStick.style, {
    position: "absolute",
    right: "5px",
    top: `${ARM_H / 2 - 2}px`,
    width: "18px",
    height: "3px",
    background: skinColor,
    borderRadius: "2px"
  });
  const armLFist = document.createElement("span");
  const armHandEmoji = isFemale ? "\u{1F485}" : "\u{1F91C}";
  armLFist.textContent = armHandEmoji;
  Object.assign(armLFist.style, {
    position: "absolute",
    fontSize: "17px",
    lineHeight: "1",
    left: "0",
    top: `${ARM_H / 2 - 10}px`,
    transform: isFemale ? "none" : "scaleX(-1)",
    userSelect: "none",
    pointerEvents: "none"
  });
  armL.append(armLStick, armLFist);
  shirtRow.appendChild(armL);
  const armR = document.createElement("div");
  armR.dataset.figArmR = "";
  Object.assign(armR.style, {
    position: "absolute",
    width: `${ARM_W}px`,
    height: `${ARM_H}px`,
    left: `${shRx}px`,
    top: `${shY - ARM_H / 2}px`,
    transformOrigin: "left center",
    transform: "rotate(-20deg)",
    zIndex: "4",
    overflow: "visible"
  });
  const armRStick = document.createElement("div");
  Object.assign(armRStick.style, {
    position: "absolute",
    left: "5px",
    top: `${ARM_H / 2 - 2}px`,
    width: "18px",
    height: "3px",
    background: skinColor,
    borderRadius: "2px"
  });
  const armRFist = document.createElement("span");
  armRFist.textContent = armHandEmoji;
  Object.assign(armRFist.style, {
    position: "absolute",
    fontSize: "17px",
    lineHeight: "1",
    right: "0",
    top: `${ARM_H / 2 - 10}px`,
    userSelect: "none",
    pointerEvents: "none"
  });
  armR.append(armRStick, armRFist);
  shirtRow.appendChild(armR);
  const legsRow = document.createElement("div");
  Object.assign(legsRow.style, {
    display: "flex",
    justifyContent: "center",
    gap: "10px",
    flexShrink: "0",
    overflow: "visible"
  });
  const makeLeg = (isLeft) => {
    const leg = document.createElement("div");
    leg.dataset[isLeft ? "figLegL" : "figLegR"] = "";
    Object.assign(leg.style, {
      position: "relative",
      width: "20px",
      height: `${LEG_H}px`,
      transformOrigin: "top center",
      transform: "rotate(0deg)",
      overflow: "visible"
    });
    const stick = document.createElement("div");
    Object.assign(stick.style, {
      position: "absolute",
      width: "3px",
      height: `${LEG_STICK_H}px`,
      background: ink,
      borderRadius: "1px",
      left: "50%",
      top: "0",
      transform: "translateX(-50%)"
    });
    const shoe = document.createElement("span");
    shoe.textContent = isFemale ? "\u{1F460}" : "\u{1F45F}";
    Object.assign(shoe.style, {
      position: "absolute",
      fontSize: "17px",
      lineHeight: "1",
      bottom: "0",
      userSelect: "none",
      pointerEvents: "none"
    });
    if (isLeft) {
      shoe.style.left = "0";
      shoe.style.transform = "scaleX(-1)";
    } else {
      shoe.style.right = "0";
    }
    leg.append(stick, shoe);
    return leg;
  };
  legsRow.append(makeLeg(true), makeLeg(false));
  wrap.append(faceEl, neck, shirtRow, legsRow);
  return wrap;
}
var PART_SEL = {
  head: "[data-fig-head]",
  face: "[data-fig-face]",
  body: "[data-fig-body]",
  arm_left: "[data-fig-arm-l]",
  arm_right: "[data-fig-arm-r]",
  leg_left: "[data-fig-leg-l]",
  leg_right: "[data-fig-leg-r]"
};
function readRotation(el) {
  const m = /rotate\((-?[\d.]+)deg\)/.exec(el.style.transform ?? "");
  return m ? Number(m[1]) : 0;
}
function createActorEl(name, def, assetDefs, assetOverrides) {
  let el;
  switch (def.type) {
    case "sprite": {
      const assetName = def.args[0] ?? "";
      const assetDef = assetDefs[assetName];
      if (assetDef?.type === "icon") {
        const span = document.createElement("span");
        span.style.display = "inline-block";
        span.style.fontSize = `${def.size ?? 32}px`;
        span.style.lineHeight = "1";
        span.dataset.icon = assetDef.value;
        span.setAttribute("aria-label", assetDef.value.split(":").pop() ?? "icon");
        el = span;
      } else {
        const img = document.createElement("img");
        img.src = assetOverrides[assetName] ?? assetDef?.value ?? "";
        img.alt = assetName;
        img.style.display = "block";
        img.setAttribute("draggable", "false");
        el = img;
      }
      break;
    }
    case "text": {
      const div = document.createElement("div");
      div.textContent = def.args[0] ?? "";
      div.style.fontSize = `${def.size ?? 24}px`;
      div.style.fontFamily = "sans-serif";
      div.style.whiteSpace = "nowrap";
      div.style.userSelect = "none";
      div.style.pointerEvents = "none";
      el = div;
      break;
    }
    case "figure": {
      el = createFigureEl(def);
      break;
    }
    default: {
      const div = document.createElement("div");
      div.style.width = "100px";
      div.style.height = "100px";
      div.style.background = "#999";
      div.style.boxSizing = "border-box";
      el = div;
      break;
    }
  }
  el.dataset.markdyActor = name;
  el.style.position = "absolute";
  el.style.left = "0";
  el.style.top = "0";
  el.style.transformOrigin = "center center";
  el.style.transform = tx(stateFrom(def));
  el.style.opacity = String(def.opacity ?? 1);
  return el;
}
function buildAnimations(ast, actorEls, scene, assetOverrides, faceSwaps) {
  const anims = [];
  const states = /* @__PURE__ */ new Map();
  for (const [name, def] of Object.entries(ast.actors)) {
    states.set(name, stateFrom(def));
  }
  const events = [...ast.events].sort((a, b) => a.time - b.time);
  const firstEventByActor = /* @__PURE__ */ new Map();
  for (const ev of events) {
    if (!firstEventByActor.has(ev.actor)) firstEventByActor.set(ev.actor, ev);
  }
  for (const [name, def] of Object.entries(ast.actors)) {
    const el = actorEls.get(name);
    const s = states.get(name);
    if (!el || !s) continue;
    const firstEv = firstEventByActor.get(name);
    if (firstEv?.action === "enter") {
      const from = String(firstEv.params.from ?? "left");
      const offscreen = { ...s };
      switch (from) {
        case "left":
          offscreen.x = -ast.meta.width * 1.1;
          break;
        case "right":
          offscreen.x = ast.meta.width * 2.1;
          break;
        case "top":
          offscreen.y = -ast.meta.height * 1.1;
          break;
        case "bottom":
          offscreen.y = ast.meta.height * 2.1;
          break;
      }
      el.style.transform = tx(offscreen);
    }
    if (firstEv?.action === "fade_in" && (def.opacity === void 0 || def.opacity > 0)) {
      el.style.opacity = "0";
    }
  }
  for (const ev of events) {
    const el = actorEls.get(ev.actor);
    const s = states.get(ev.actor);
    if (!el || !s) continue;
    const delayMs = ev.time * 1e3;
    const durMs = Math.max(
      1,
      (typeof ev.params.dur === "number" ? ev.params.dur : 0.5) * 1e3
    );
    const easing = toEasing(ev.params.ease);
    const baseOpts = {
      delay: delayMs,
      duration: durMs,
      fill: "forwards",
      easing
    };
    switch (ev.action) {
      // ── move ──────────────────────────────────────────────────────────────
      case "move": {
        const toArr = ev.params.to;
        const toX = toArr?.[0] ?? s.x;
        const toY = toArr?.[1] ?? s.y;
        anims.push(
          el.animate(
            [{ transform: tx(s) }, { transform: tx({ ...s, x: toX, y: toY }) }],
            baseOpts
          )
        );
        s.x = toX;
        s.y = toY;
        break;
      }
      // ── enter ─────────────────────────────────────────────────────────────
      case "enter": {
        const from = String(ev.params.from ?? "left");
        const fromState = { ...s };
        switch (from) {
          case "left":
            fromState.x = -ast.meta.width;
            break;
          case "right":
            fromState.x = ast.meta.width * 2;
            break;
          case "top":
            fromState.y = -ast.meta.height;
            break;
          case "bottom":
            fromState.y = ast.meta.height * 2;
            break;
        }
        anims.push(
          el.animate(
            [{ transform: tx(fromState) }, { transform: tx(s) }],
            baseOpts
          )
        );
        break;
      }
      // ── fade_in ───────────────────────────────────────────────────────────
      case "fade_in": {
        anims.push(el.animate([{ opacity: 0 }, { opacity: 1 }], baseOpts));
        s.opacity = 1;
        break;
      }
      // ── fade_out ──────────────────────────────────────────────────────────
      case "fade_out": {
        anims.push(
          el.animate([{ opacity: s.opacity }, { opacity: 0 }], baseOpts)
        );
        s.opacity = 0;
        break;
      }
      // ── scale ─────────────────────────────────────────────────────────────
      case "scale": {
        const toScale = typeof ev.params.to === "number" ? ev.params.to : s.scale;
        anims.push(
          el.animate(
            [
              { transform: tx(s) },
              { transform: tx({ ...s, scale: toScale }) }
            ],
            baseOpts
          )
        );
        s.scale = toScale;
        break;
      }
      // ── rotate ────────────────────────────────────────────────────────────
      case "rotate": {
        const toDeg = typeof ev.params.to === "number" ? ev.params.to : s.rotate;
        anims.push(
          el.animate(
            [
              { transform: tx(s) },
              { transform: tx({ ...s, rotate: toDeg }) }
            ],
            baseOpts
          )
        );
        s.rotate = toDeg;
        break;
      }
      // ── shake ─────────────────────────────────────────────────────────────
      case "shake": {
        const mag = typeof ev.params.intensity === "number" ? ev.params.intensity : 5;
        anims.push(
          el.animate(
            [
              { transform: tx(s), offset: 0 },
              { transform: tx({ ...s, x: s.x + mag }), offset: 0.2 },
              { transform: tx({ ...s, x: s.x - mag }), offset: 0.4 },
              { transform: tx({ ...s, x: s.x + mag }), offset: 0.6 },
              { transform: tx({ ...s, x: s.x - mag }), offset: 0.8 },
              { transform: tx(s), offset: 1 }
            ],
            { ...baseOpts, easing: "linear" }
          )
        );
        break;
      }
      // ── punch ─────────────────────────────────────────────────────────────
      // Swings one arm out and snaps it back. Works on figure actors only.
      //   side = "left" | "right"  (default "right")
      case "punch": {
        const pSide = String(ev.params.side ?? "right");
        const pArmEl = el.querySelector(
          pSide === "left" ? "[data-fig-arm-l]" : "[data-fig-arm-r]"
        );
        if (!pArmEl) break;
        const pRest = readRotation(pArmEl);
        const pExtend = pSide === "left" ? -75 : 75;
        anims.push(
          pArmEl.animate(
            [
              { transform: `rotate(${pRest}deg)` },
              { transform: `rotate(${pExtend}deg)`, offset: 0.35 },
              { transform: `rotate(${pRest}deg)` }
            ],
            { ...baseOpts, easing: "ease-in-out", fill: "forwards" }
          )
        );
        break;
      }
      // ── kick ──────────────────────────────────────────────────────────────
      // Swings one leg out and snaps it back. Works on figure actors only.
      //   side = "left" | "right"  (default "right")
      case "kick": {
        const kSide = String(ev.params.side ?? "right");
        const kLegEl = el.querySelector(
          kSide === "left" ? "[data-fig-leg-l]" : "[data-fig-leg-r]"
        );
        if (!kLegEl) break;
        const kRest = readRotation(kLegEl);
        const kExtend = kSide === "left" ? -100 : 100;
        anims.push(
          kLegEl.animate(
            [
              { transform: `rotate(${kRest}deg)` },
              { transform: `rotate(${kExtend}deg)`, offset: 0.38 },
              { transform: `rotate(${kRest}deg)` }
            ],
            { ...baseOpts, easing: "ease-in-out", fill: "forwards" }
          )
        );
        break;
      }
      // ── rotate_part ───────────────────────────────────────────────────────
      // Rotates any named body part of a figure actor to a target angle.
      // Named parts: head, body, arm_left, arm_right, leg_left, leg_right
      //
      //   @1.0: guy.rotate_part(part=arm_right, to=90, dur=0.4)
      //   @2.0: guy.rotate_part(part=leg_left,  to=-60, dur=0.35)
      //   @3.0: guy.rotate_part(part=head,      to=20,  dur=0.3)
      case "rotate_part": {
        const rpName = String(ev.params.part ?? "");
        const rpSel = PART_SEL[rpName];
        if (!rpSel) break;
        const rpEl = el.querySelector(rpSel);
        if (!rpEl) break;
        const rpFrom = readRotation(rpEl);
        const rpTo = typeof ev.params.to === "number" ? ev.params.to : rpFrom;
        anims.push(
          rpEl.animate(
            [
              { transform: `rotate(${rpFrom}deg)` },
              { transform: `rotate(${rpTo}deg)` }
            ],
            { ...baseOpts, fill: "forwards" }
          )
        );
        rpEl.style.transform = rpEl.style.transform.replace(
          /rotate\([^)]*\)/,
          `rotate(${rpTo}deg)`
        );
        break;
      }
      // ── face ──────────────────────────────────────────────────────────────
      // Instantly swaps the emoji face of a figure actor.
      // Seek-safe: recorded in faceSwaps[]; the rAF loop applies the latest
      // swap whose timeMs <= sceneMs every frame, so it works correctly for
      // both forward playback and seek-backwards.
      //
      //   @5.0: bruno.face("😡")
      //   @9.5: alex.face("😵")
      case "face": {
        const fEl = el.querySelector("[data-fig-face]");
        if (!fEl) break;
        const emoji = String(ev.params.text ?? ev.params._0 ?? "");
        if (emoji) faceSwaps.push({ timeMs: ev.time * 1e3, el: fEl, emoji });
        break;
      }
      // ── say ───────────────────────────────────────────────────────────────
      case "say": {
        const text = String(ev.params.text ?? "");
        const inverseScale = 1 / (s.scale || 1);
        const bubble = document.createElement("div");
        bubble.textContent = text;
        bubble.style.opacity = "0";
        Object.assign(bubble.style, {
          position: "absolute",
          bottom: "calc(100% + 8px)",
          left: "50%",
          transform: `translateX(-50%) scale(${inverseScale})`,
          transformOrigin: "center bottom",
          background: "white",
          border: "2px solid #222",
          borderRadius: "10px",
          padding: "4px 10px",
          fontFamily: "sans-serif",
          fontSize: "14px",
          whiteSpace: "nowrap",
          pointerEvents: "none",
          zIndex: "10",
          boxShadow: "0 2px 6px rgba(0,0,0,0.15)"
        });
        const tail = document.createElement("span");
        Object.assign(tail.style, {
          position: "absolute",
          bottom: "-10px",
          left: "50%",
          transform: "translateX(-50%)",
          width: "0",
          height: "0",
          borderLeft: "6px solid transparent",
          borderRight: "6px solid transparent",
          borderTop: "10px solid #222"
        });
        bubble.appendChild(tail);
        el.style.overflow = "visible";
        el.appendChild(bubble);
        const fadeDur = Math.min(200, durMs * 0.15);
        anims.push(
          bubble.animate([{ opacity: 0 }, { opacity: 1 }], {
            delay: delayMs,
            duration: fadeDur,
            fill: "forwards"
          }),
          bubble.animate([{ opacity: 1 }, { opacity: 0 }], {
            delay: delayMs + durMs - fadeDur,
            duration: fadeDur,
            fill: "forwards"
          })
        );
        break;
      }
      // ── throw ─────────────────────────────────────────────────────────────
      case "throw": {
        const assetName = String(ev.params.asset ?? "");
        const targetActorName = String(ev.params.to ?? "");
        const targetState = states.get(targetActorName);
        const assetDef = ast.assets[assetName];
        if (!assetDef || !targetState) break;
        let projectile;
        if (assetDef.type === "image") {
          const img = document.createElement("img");
          img.src = assetOverrides[assetName] ?? assetDef.value;
          img.alt = assetName;
          img.setAttribute("draggable", "false");
          img.style.width = "32px";
          img.style.height = "32px";
          projectile = img;
        } else {
          const span = document.createElement("span");
          span.dataset.icon = assetDef.value;
          span.style.fontSize = "32px";
          span.style.lineHeight = "1";
          span.style.display = "inline-block";
          projectile = span;
        }
        Object.assign(projectile.style, {
          position: "absolute",
          left: "0",
          top: "0",
          pointerEvents: "none",
          zIndex: "9",
          // Hidden until throw animation activates (no backward fill).
          opacity: "0"
        });
        scene.appendChild(projectile);
        const throwAnim = projectile.animate(
          [
            { transform: tx(s), opacity: 1 },
            { transform: tx(targetState), opacity: 0 }
          ],
          { ...baseOpts, easing: "ease-in" }
        );
        throwAnim.addEventListener("finish", () => {
          if (projectile.parentNode === scene) scene.removeChild(projectile);
        });
        anims.push(throwAnim);
        break;
      }
      default:
        break;
    }
  }
  return anims;
}
function createPlayer(opts) {
  const { container, code, assets: assetOverrides = {}, autoplay = false } = opts;
  const ast = parse(code);
  const scene = document.createElement("div");
  Object.assign(scene.style, {
    position: "relative",
    width: `${ast.meta.width}px`,
    height: `${ast.meta.height}px`,
    background: ast.meta.bg,
    overflow: "hidden",
    userSelect: "none"
  });
  container.appendChild(scene);
  const actorEls = /* @__PURE__ */ new Map();
  for (const [name, def] of Object.entries(ast.actors)) {
    const el = createActorEl(name, def, ast.assets, assetOverrides);
    scene.appendChild(el);
    actorEls.set(name, el);
  }
  const faceSwaps = [];
  const allAnims = buildAnimations(ast, actorEls, scene, assetOverrides, faceSwaps);
  faceSwaps.sort((a, b) => a.timeMs - b.timeMs);
  for (const anim of allAnims) {
    anim.pause();
    anim.currentTime = 0;
  }
  let sceneMs = 0;
  let lastRafTs = null;
  let isPlaying = false;
  let rafId = null;
  function applyCurrentTime() {
    for (const anim of allAnims) {
      anim.currentTime = sceneMs;
    }
    if (faceSwaps.length > 0) {
      const elEmoji = /* @__PURE__ */ new Map();
      for (const { timeMs, el, emoji } of faceSwaps) {
        if (timeMs <= sceneMs) elEmoji.set(el, emoji);
      }
      for (const [el, emoji] of elEmoji) {
        if (el.textContent !== emoji) el.textContent = emoji;
      }
      const elFirst = /* @__PURE__ */ new Map();
      for (const { el, emoji } of faceSwaps) {
        if (!elFirst.has(el)) elFirst.set(el, emoji);
      }
      for (const [el, firstEmoji] of elFirst) {
        if (!elEmoji.has(el)) {
          const initial = el.dataset["figFaceInitial"] ?? firstEmoji;
          if (el.textContent !== initial) el.textContent = initial;
        }
      }
    }
  }
  for (const { el } of faceSwaps) {
    if (!el.dataset["figFaceInitial"]) {
      el.dataset["figFaceInitial"] = el.textContent ?? "";
    }
  }
  function rafTick(timestamp) {
    if (lastRafTs !== null) {
      sceneMs += timestamp - lastRafTs;
    }
    lastRafTs = timestamp;
    const totalMs = (ast.meta.duration ?? 0) * 1e3;
    if (totalMs > 0 && sceneMs >= totalMs) {
      sceneMs = totalMs;
      applyCurrentTime();
      isPlaying = false;
      lastRafTs = null;
      rafId = null;
      return;
    }
    applyCurrentTime();
    rafId = requestAnimationFrame(rafTick);
  }
  const player = {
    play() {
      if (isPlaying) return;
      isPlaying = true;
      lastRafTs = null;
      rafId = requestAnimationFrame(rafTick);
    },
    pause() {
      if (!isPlaying) return;
      isPlaying = false;
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      lastRafTs = null;
    },
    seek(seconds) {
      sceneMs = seconds * 1e3;
      applyCurrentTime();
    },
    destroy() {
      player.pause();
      for (const anim of allAnims) anim.cancel();
      if (scene.parentNode === container) container.removeChild(scene);
    }
  };
  if (autoplay) player.play();
  return player;
}
export {
  createPlayer
};

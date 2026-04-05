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
  const skinColor = def.args[0] ?? "#ffdbac";
  const gender = def.args[1] === "f" ? "f" : "m";
  const ink = "#222";
  const wrap = document.createElement("div");
  wrap.style.width = "60px";
  wrap.style.height = "110px";
  wrap.style.overflow = "visible";
  const head = document.createElement("div");
  Object.assign(head.style, {
    position: "absolute",
    left: "15px",
    top: "0",
    width: "30px",
    height: "30px",
    borderRadius: "50%",
    background: skinColor,
    border: `2.5px solid ${ink}`,
    boxSizing: "border-box",
    zIndex: "2"
  });
  [-7, 7].forEach((ox) => {
    const eye = document.createElement("div");
    Object.assign(eye.style, {
      position: "absolute",
      width: "3.5px",
      height: "3.5px",
      background: ink,
      borderRadius: "50%",
      left: `${12 + ox}px`,
      top: "9px"
    });
    head.appendChild(eye);
  });
  const mouth = document.createElement("div");
  Object.assign(mouth.style, {
    position: "absolute",
    width: "12px",
    height: "6px",
    left: "7px",
    top: "16px",
    borderBottom: `2px solid ${ink}`,
    borderLeft: `1.5px solid ${ink}`,
    borderRight: `1.5px solid ${ink}`,
    borderRadius: "0 0 8px 8px",
    boxSizing: "border-box"
  });
  head.appendChild(mouth);
  const body = document.createElement("div");
  Object.assign(body.style, {
    position: "absolute",
    width: "3px",
    height: "36px",
    left: "28.5px",
    top: "32px",
    background: ink,
    borderRadius: "1px"
  });
  const armL = document.createElement("div");
  armL.dataset.figArmL = "";
  Object.assign(armL.style, {
    position: "absolute",
    width: "26px",
    height: "3px",
    right: "32px",
    top: "41px",
    background: ink,
    transformOrigin: "right center",
    transform: "rotate(25deg)",
    borderRadius: "1px 3px 3px 1px"
  });
  const armR = document.createElement("div");
  armR.dataset.figArmR = "";
  Object.assign(armR.style, {
    position: "absolute",
    width: "26px",
    height: "3px",
    left: "32px",
    top: "41px",
    background: ink,
    transformOrigin: "left center",
    transform: "rotate(-25deg)",
    borderRadius: "3px 1px 1px 3px"
  });
  if (gender === "f") {
    const bun = document.createElement("div");
    Object.assign(bun.style, {
      position: "absolute",
      left: "14px",
      top: "-9px",
      width: "32px",
      height: "19px",
      background: "#7B3F00",
      borderRadius: "50% 50% 30% 30%",
      border: `2px solid ${ink}`,
      boxSizing: "border-box",
      zIndex: "1"
    });
    const skirt = document.createElement("div");
    Object.assign(skirt.style, {
      position: "absolute",
      left: "8px",
      top: "67px",
      width: "44px",
      height: "24px",
      background: "#e87fba",
      clipPath: "polygon(25% 0%, 75% 0%, 100% 100%, 0% 100%)"
    });
    const legL = document.createElement("div");
    legL.dataset.figLegL = "";
    Object.assign(legL.style, {
      position: "absolute",
      width: "3px",
      height: "22px",
      left: "20px",
      top: "89px",
      background: ink,
      transformOrigin: "top center",
      transform: "rotate(-10deg)",
      borderRadius: "1px"
    });
    const legR = document.createElement("div");
    legR.dataset.figLegR = "";
    Object.assign(legR.style, {
      position: "absolute",
      width: "3px",
      height: "22px",
      left: "37px",
      top: "89px",
      background: ink,
      transformOrigin: "top center",
      transform: "rotate(10deg)",
      borderRadius: "1px"
    });
    wrap.append(bun, head, body, armL, armR, skirt, legL, legR);
  } else {
    const legL = document.createElement("div");
    legL.dataset.figLegL = "";
    Object.assign(legL.style, {
      position: "absolute",
      width: "3px",
      height: "36px",
      left: "24px",
      top: "67px",
      background: ink,
      transformOrigin: "top center",
      transform: "rotate(-18deg)",
      borderRadius: "1px"
    });
    const legR = document.createElement("div");
    legR.dataset.figLegR = "";
    Object.assign(legR.style, {
      position: "absolute",
      width: "3px",
      height: "36px",
      left: "33px",
      top: "67px",
      background: ink,
      transformOrigin: "top center",
      transform: "rotate(18deg)",
      borderRadius: "1px"
    });
    wrap.append(head, body, armL, armR, legL, legR);
  }
  return wrap;
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
function buildAnimations(ast, actorEls, scene, assetOverrides) {
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
      // Swings one arm outward and back. Targets figure actors only;
      // silently ignored for other actor types.
      case "punch": {
        const punchSide = String(ev.params.side ?? "right");
        const armSel = punchSide === "left" ? "[data-fig-arm-l]" : "[data-fig-arm-r]";
        const armEl = el.querySelector(armSel);
        if (!armEl) break;
        const restMatch = /rotate\((-?[\d.]+)deg\)/.exec(armEl.style.transform ?? "");
        const restAngle = restMatch ? Number(restMatch[1]) : punchSide === "left" ? 25 : -25;
        const punchAngle = punchSide === "left" ? -70 : 70;
        anims.push(
          armEl.animate(
            [
              { transform: `rotate(${restAngle}deg)` },
              { transform: `rotate(${punchAngle}deg)`, offset: 0.35 },
              { transform: `rotate(${restAngle}deg)` }
            ],
            { ...baseOpts, easing: "ease-in-out", fill: "forwards" }
          )
        );
        break;
      }
      // ── kick ──────────────────────────────────────────────────────────────
      // Swings one leg outward and back. Targets figure actors only.
      case "kick": {
        const kickSide = String(ev.params.side ?? "right");
        const legSel = kickSide === "left" ? "[data-fig-leg-l]" : "[data-fig-leg-r]";
        const legEl = el.querySelector(legSel);
        if (!legEl) break;
        const legRestMatch = /rotate\((-?[\d.]+)deg\)/.exec(legEl.style.transform ?? "");
        const legRestAngle = legRestMatch ? Number(legRestMatch[1]) : kickSide === "left" ? -18 : 18;
        const kickAngle = kickSide === "left" ? -100 : 100;
        anims.push(
          legEl.animate(
            [
              { transform: `rotate(${legRestAngle}deg)` },
              { transform: `rotate(${kickAngle}deg)`, offset: 0.38 },
              { transform: `rotate(${legRestAngle}deg)` }
            ],
            { ...baseOpts, easing: "ease-in-out", fill: "forwards" }
          )
        );
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
  const allAnims = buildAnimations(ast, actorEls, scene, assetOverrides);
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

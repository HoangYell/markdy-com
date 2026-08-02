import type { SceneAST, ActorDef } from "@markdy/core";
import type { ActorState } from "./types.js";
import { stateFrom, tx, txCaption } from "./types.js";
import { createFigureEl } from "./figure.js";

const ARCHITECTURE_NODE_TYPES = new Set([
  "service",
  "api",
  "microservice",
  "client",
  "user",
  "db",
  "database",
  "queue",
  "cache",
  "cloud",
  "region",
  "container",
  "cluster",
]);

const SHOWCASE_SURFACE_TYPES = new Set(["parking_map", "ascii_map", "game_scene", "byte_viz"]);

const ARCHITECTURE_STYLE_ID = "markdy-architecture-node-styles";
const SHOWCASE_STYLE_ID = "markdy-showcase-surface-styles";

function ensureShowcaseStyles(doc: Document): void {
  if (doc.getElementById(SHOWCASE_STYLE_ID)) return;

  const style = doc.createElement("style");
  style.id = SHOWCASE_STYLE_ID;
  style.textContent = `
.markdy-showcase {
  --surface-a: rgba(15, 23, 42, 0.9);
  --accent: #38bdf8;
  --accent-2: #22c55e;
  position: relative;
  box-sizing: border-box;
  width: 390px;
  height: 250px;
  overflow: hidden;
  border: 1px solid rgba(148, 163, 184, 0.34);
  border-radius: 24px;
  color: #e5f3ff;
  background:
    radial-gradient(circle at 12% 0%, color-mix(in srgb, var(--accent) 32%, transparent), transparent 34%),
    radial-gradient(circle at 90% 15%, color-mix(in srgb, var(--accent-2) 26%, transparent), transparent 34%),
    linear-gradient(145deg, rgba(255, 255, 255, 0.13), rgba(255, 255, 255, 0.025) 32%, var(--surface-a));
  box-shadow:
    0 26px 70px rgba(2, 6, 23, 0.42),
    0 0 0 1px rgba(255, 255, 255, 0.06) inset,
    0 1px 0 rgba(255, 255, 255, 0.18) inset,
    0 0 44px color-mix(in srgb, var(--accent) 24%, transparent);
  font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  isolation: isolate;
  contain: layout paint style;
  backdrop-filter: blur(16px) saturate(1.2);
  -webkit-backdrop-filter: blur(16px) saturate(1.2);
}
.markdy-showcase::before {
  content: "";
  position: absolute;
  inset: 0;
  z-index: -1;
  background:
    linear-gradient(90deg, transparent 0 48%, rgba(255, 255, 255, 0.09) 50%, transparent 52%) 0 0 / 34px 34px,
    linear-gradient(0deg, transparent 0 48%, rgba(255, 255, 255, 0.055) 50%, transparent 52%) 0 0 / 34px 34px;
  mask-image: linear-gradient(to bottom, rgba(0,0,0,0.85), transparent 82%);
  opacity: 0.48;
  animation: markdyGridDrift 7s linear infinite;
}
.markdy-showcase::after {
  content: "";
  position: absolute;
  inset: -40% -20%;
  z-index: -1;
  background: conic-gradient(from 90deg, transparent, color-mix(in srgb, var(--accent) 20%, transparent), transparent 32%);
  opacity: 0.6;
  animation: markdyAurora 9s linear infinite;
}
.markdy-showcase--byte_viz { width: 420px; }
.markdy-showcase__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px 8px;
}
.markdy-showcase__title {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 15px;
  font-weight: 820;
  letter-spacing: 0.01em;
  color: #f8fafc;
}
.markdy-showcase__pill {
  flex: 0 0 auto;
  border: 1px solid color-mix(in srgb, var(--accent) 42%, transparent);
  border-radius: 999px;
  padding: 4px 8px;
  color: #bae6fd;
  background: rgba(8, 47, 73, 0.54);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  box-shadow: 0 0 16px color-mix(in srgb, var(--accent) 22%, transparent);
}
.markdy-showcase__body { position: absolute; inset: 48px 14px 14px; }
.markdy-showcase--parking_map { --accent: #38bdf8; --accent-2: #22c55e; }
.parking-map__road {
  position: absolute;
  left: 14px;
  right: 14px;
  top: 78px;
  height: 50px;
  border-radius: 999px;
  background:
    repeating-linear-gradient(90deg, rgba(226, 232, 240, 0.78) 0 18px, transparent 18px 34px) center / 100% 3px no-repeat,
    linear-gradient(90deg, rgba(15, 23, 42, 0.96), rgba(30, 41, 59, 0.88));
  box-shadow: 0 10px 28px rgba(2, 6, 23, 0.28) inset;
}
.parking-map__scan {
  position: absolute;
  left: 28px;
  top: 42px;
  width: 66px;
  height: 124px;
  border-radius: 18px;
  border: 1px solid rgba(56, 189, 248, 0.55);
  background: linear-gradient(180deg, rgba(56, 189, 248, 0.22), transparent);
  box-shadow: 0 0 24px rgba(56, 189, 248, 0.28);
  animation: markdyScanPulse 1.8s ease-in-out infinite;
}
.parking-map__car {
  position: absolute;
  left: 48px;
  top: 86px;
  width: 46px;
  height: 22px;
  border-radius: 11px 15px 15px 11px;
  background: linear-gradient(90deg, #22d3ee, #818cf8);
  box-shadow: 0 0 18px rgba(56, 189, 248, 0.55), 0 8px 18px rgba(2, 6, 23, 0.35);
  animation: markdyCarGlide 3.8s cubic-bezier(.4,0,.2,1) infinite;
}
.parking-map__car::before,
.parking-map__car::after {
  content: "";
  position: absolute;
  bottom: -4px;
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: #020617;
  border: 2px solid #cbd5e1;
}
.parking-map__car::before { left: 7px; }
.parking-map__car::after { right: 7px; }
.parking-map__slots {
  position: absolute;
  right: 12px;
  top: 24px;
  display: grid;
  grid-template-columns: repeat(4, 44px);
  gap: 8px;
}
.parking-map__slot {
  height: 34px;
  border-radius: 10px;
  border: 1px solid rgba(148, 163, 184, 0.34);
  background: rgba(15, 23, 42, 0.7);
  box-shadow: 0 0 0 1px rgba(255,255,255,0.035) inset;
}
.parking-map__slot:nth-child(3),
.parking-map__slot:nth-child(6),
.parking-map__slot:nth-child(8) {
  border-color: rgba(34, 197, 94, 0.78);
  background: rgba(20, 83, 45, 0.5);
  animation: markdySlotGlow 1.7s ease-in-out infinite;
}
.parking-map__route {
  position: absolute;
  left: 91px;
  right: 95px;
  top: 109px;
  height: 3px;
  border-radius: 999px;
  background: linear-gradient(90deg, transparent, #22c55e, #38bdf8, transparent);
  filter: drop-shadow(0 0 8px #22c55e);
  animation: markdyRouteFlow 1.5s linear infinite;
}
.parking-map__stats {
  position: absolute;
  left: 12px;
  right: 12px;
  bottom: 5px;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}
.parking-map__stat,
.ascii-map__badge,
.game-scene__hud,
.byte-viz__badge {
  border: 1px solid rgba(148, 163, 184, 0.24);
  border-radius: 12px;
  padding: 8px;
  background: rgba(2, 6, 23, 0.42);
  color: #cbd5e1;
  font-size: 10px;
  font-weight: 760;
}
.parking-map__stat strong,
.byte-viz__badge strong {
  display: block;
  margin-top: 2px;
  color: #f8fafc;
  font-size: 16px;
}
.markdy-showcase--ascii_map { --accent: #22c55e; --accent-2: #38bdf8; }
.ascii-map__terminal {
  position: absolute;
  inset: 0;
  border-radius: 18px;
  border: 1px solid rgba(34, 197, 94, 0.34);
  background: linear-gradient(180deg, rgba(2, 6, 23, 0.72), rgba(2, 6, 23, 0.36));
  box-shadow: 0 0 28px rgba(34, 197, 94, 0.16) inset;
}
.ascii-map__chrome {
  height: 28px;
  padding-left: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.16);
}
.ascii-map__chrome span {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: #ef4444;
  box-shadow: 14px 0 #f59e0b, 28px 0 #22c55e;
}
.ascii-map__code {
  position: absolute;
  left: 16px;
  top: 46px;
  font-family: "SFMono-Regular", Consolas, monospace;
  font-size: 19px;
  line-height: 1.55;
  color: #bbf7d0;
  text-shadow: 0 0 12px rgba(34, 197, 94, 0.45);
}
.ascii-map__code b {
  color: #67e8f9;
  animation: markdyBlink 1.2s steps(2, end) infinite;
}
.ascii-map__minimap {
  position: absolute;
  right: 18px;
  top: 48px;
  width: 102px;
  height: 122px;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 7px;
}
.ascii-map__mini-slot {
  border-radius: 7px;
  border: 1px solid rgba(148, 163, 184, 0.28);
  background: rgba(15, 23, 42, 0.72);
}
.ascii-map__mini-slot:nth-child(2),
.ascii-map__mini-slot:nth-child(6) {
  border-color: rgba(34, 197, 94, 0.85);
  background: rgba(20, 83, 45, 0.56);
}
.ascii-map__transform {
  position: absolute;
  left: 16px;
  right: 16px;
  bottom: 10px;
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 8px;
}
.markdy-showcase--game_scene { --accent: #f59e0b; --accent-2: #22c55e; }
.game-scene__world {
  position: absolute;
  inset: 0;
  border-radius: 18px;
  overflow: hidden;
  background:
    radial-gradient(circle at 80% 18%, rgba(245, 158, 11, 0.22), transparent 26%),
    linear-gradient(160deg, #172554, #020617 72%);
}
.game-scene__world::before {
  content: "";
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(115deg, transparent 0 22px, rgba(255,255,255,0.06) 22px 24px);
  animation: markdyRoadMove 4s linear infinite;
}
.game-scene__road {
  position: absolute;
  left: -35px;
  right: -35px;
  top: 94px;
  height: 76px;
  transform: rotate(-8deg);
  background:
    repeating-linear-gradient(90deg, #e2e8f0 0 24px, transparent 24px 46px) center / 100% 4px no-repeat,
    linear-gradient(180deg, #334155, #0f172a);
  box-shadow: 0 18px 32px rgba(2, 6, 23, 0.42);
}
.game-scene__car {
  position: absolute;
  left: 88px;
  top: 126px;
  width: 58px;
  height: 30px;
  border-radius: 12px 18px 18px 12px;
  background: linear-gradient(90deg, #fb7185, #f59e0b);
  transform: rotate(-8deg);
  box-shadow: 0 0 24px rgba(245, 158, 11, 0.52);
  animation: markdyCarPark 3.4s cubic-bezier(.2,1,.3,1) infinite;
}
.game-scene__spot {
  position: absolute;
  right: 54px;
  top: 85px;
  width: 90px;
  height: 68px;
  border: 3px solid rgba(34, 197, 94, 0.78);
  border-left-style: dashed;
  border-radius: 10px;
  filter: drop-shadow(0 0 12px rgba(34, 197, 94, 0.48));
}
.game-scene__cones {
  position: absolute;
  right: 80px;
  bottom: 34px;
  display: flex;
  gap: 14px;
}
.game-scene__cone {
  width: 0;
  height: 0;
  border-left: 10px solid transparent;
  border-right: 10px solid transparent;
  border-bottom: 26px solid #f97316;
  filter: drop-shadow(0 5px 8px rgba(2, 6, 23, 0.35));
}
.game-scene__hud {
  position: absolute;
  left: 14px;
  top: 14px;
  min-width: 120px;
  border-color: rgba(245, 158, 11, 0.38);
}
.game-scene__hud strong { color: #fed7aa; font-size: 18px; }
.game-scene__perfect {
  position: absolute;
  left: 132px;
  top: 54px;
  color: #fef3c7;
  font-size: 21px;
  font-weight: 900;
  letter-spacing: 0.05em;
  text-shadow: 0 0 18px rgba(245, 158, 11, 0.7);
  animation: markdyPerfectPop 1.6s ease-in-out infinite;
}
.markdy-showcase--byte_viz { --accent: #a78bfa; --accent-2: #38bdf8; }
.byte-viz__pipeline {
  position: absolute;
  inset: 4px;
  display: grid;
  grid-template-columns: 98px 1fr 122px;
  gap: 12px;
  align-items: stretch;
}
.byte-viz__glyph {
  display: grid;
  place-items: center;
  border-radius: 22px;
  border: 1px solid rgba(167, 139, 250, 0.45);
  background: radial-gradient(circle at 30% 20%, rgba(167, 139, 250, 0.42), rgba(15, 23, 42, 0.78));
  color: #fff;
  font-size: 72px;
  font-weight: 920;
  box-shadow: 0 0 34px rgba(167, 139, 250, 0.32) inset;
}
.byte-viz__middle { display: grid; gap: 10px; }
.byte-viz__row {
  display: flex;
  align-items: center;
  gap: 7px;
}
.byte-viz__chip {
  flex: 1 1 0;
  border: 1px solid rgba(148, 163, 184, 0.25);
  border-radius: 12px;
  padding: 8px 10px;
  background: rgba(2, 6, 23, 0.42);
  color: #ddd6fe;
  font-family: "SFMono-Regular", Consolas, monospace;
  font-size: 12px;
  font-weight: 800;
}
.byte-viz__arrow {
  color: #67e8f9;
  filter: drop-shadow(0 0 8px #38bdf8);
  animation: markdyArrowPulse 1.1s ease-in-out infinite;
}
.byte-viz__bits {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 5px;
}
.byte-viz__bit {
  display: grid;
  place-items: center;
  height: 31px;
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.82);
  border: 1px solid rgba(56, 189, 248, 0.28);
  color: #bae6fd;
  font-family: "SFMono-Regular", Consolas, monospace;
  font-size: 12px;
  font-weight: 900;
  animation: markdyBitFlip 1.9s ease-in-out infinite;
}
.byte-viz__bit:nth-child(2n) { animation-delay: 0.12s; }
.byte-viz__bit:nth-child(3n) { animation-delay: 0.24s; }
.byte-viz__side { display: grid; gap: 9px; }
@keyframes markdyGridDrift { to { background-position: 34px 34px, 34px 34px; } }
@keyframes markdyAurora { to { transform: rotate(1turn); } }
@keyframes markdyScanPulse { 50% { transform: translateX(18px); opacity: 0.72; } }
@keyframes markdyCarGlide { 0%, 12% { transform: translateX(0); } 68%, 100% { transform: translateX(198px); } }
@keyframes markdySlotGlow { 50% { box-shadow: 0 0 20px rgba(34, 197, 94, 0.38); } }
@keyframes markdyRouteFlow { to { filter: hue-rotate(70deg) drop-shadow(0 0 9px #38bdf8); } }
@keyframes markdyBlink { 50% { opacity: 0.25; } }
@keyframes markdyRoadMove { to { background-position: 44px 0; } }
@keyframes markdyCarPark { 0%, 12% { transform: translateX(0) rotate(-8deg); } 70%, 100% { transform: translateX(164px) translateY(-31px) rotate(-1deg); } }
@keyframes markdyPerfectPop { 0%, 100% { transform: scale(0.92); opacity: 0.72; } 50% { transform: scale(1.05); opacity: 1; } }
@keyframes markdyArrowPulse { 50% { transform: translateX(3px); opacity: 0.72; } }
@keyframes markdyBitFlip { 50% { transform: translateY(-2px); border-color: rgba(167, 139, 250, 0.75); } }
`;
  doc.head.appendChild(style);
}

function createShowcaseSurfaceEl(type: string, def: ActorDef): HTMLElement {
  ensureShowcaseStyles(document);
  const label = def.args[0] || type.replace("_", " ");
  const root = document.createElement("div");
  root.className = `markdy-showcase markdy-showcase--${type}`;
  root.setAttribute("role", "img");
  root.setAttribute("aria-label", label);

  if (type === "parking_map") {
    root.innerHTML = `
      <div class="markdy-showcase__top"><div class="markdy-showcase__title"></div><div class="markdy-showcase__pill">live ops</div></div>
      <div class="markdy-showcase__body">
        <div class="parking-map__scan"></div><div class="parking-map__road"></div><div class="parking-map__route"></div><div class="parking-map__car"></div>
        <div class="parking-map__slots"><span class="parking-map__slot"></span><span class="parking-map__slot"></span><span class="parking-map__slot"></span><span class="parking-map__slot"></span><span class="parking-map__slot"></span><span class="parking-map__slot"></span><span class="parking-map__slot"></span><span class="parking-map__slot"></span></div>
        <div class="parking-map__stats"><div class="parking-map__stat">occupancy<strong>87%</strong></div><div class="parking-map__stat">OCR<strong>18ms</strong></div><div class="parking-map__stat">route<strong>A-17</strong></div></div>
      </div>`;
  } else if (type === "ascii_map") {
    root.innerHTML = `
      <div class="markdy-showcase__top"><div class="markdy-showcase__title"></div><div class="markdy-showcase__pill">parser</div></div>
      <div class="markdy-showcase__body">
        <div class="ascii-map__terminal"><div class="ascii-map__chrome"><span></span></div><div class="ascii-map__code">[P1][P2][<b>  </b>][EV]<br />[IN]===LANE===[OUT]<br />0101 0000 0100 0001</div><div class="ascii-map__minimap"><i class="ascii-map__mini-slot"></i><i class="ascii-map__mini-slot"></i><i class="ascii-map__mini-slot"></i><i class="ascii-map__mini-slot"></i><i class="ascii-map__mini-slot"></i><i class="ascii-map__mini-slot"></i></div><div class="ascii-map__transform"><div class="ascii-map__badge">tokens</div><div class="ascii-map__badge">graph</div><div class="ascii-map__badge">slots</div></div></div>
      </div>`;
  } else if (type === "game_scene") {
    root.innerHTML = `
      <div class="markdy-showcase__top"><div class="markdy-showcase__title"></div><div class="markdy-showcase__pill">60 fps</div></div>
      <div class="markdy-showcase__body">
        <div class="game-scene__world"><div class="game-scene__hud">combo<br /><strong>x4.2</strong></div><div class="game-scene__perfect">PERFECT PARK</div><div class="game-scene__road"></div><div class="game-scene__spot"></div><div class="game-scene__car"></div><div class="game-scene__cones"><i class="game-scene__cone"></i><i class="game-scene__cone"></i><i class="game-scene__cone"></i></div></div>
      </div>`;
  } else {
    root.innerHTML = `
      <div class="markdy-showcase__top"><div class="markdy-showcase__title"></div><div class="markdy-showcase__pill">UTF-8</div></div>
      <div class="markdy-showcase__body">
        <div class="byte-viz__pipeline"><div class="byte-viz__glyph">A</div><div class="byte-viz__middle"><div class="byte-viz__row"><div class="byte-viz__chip">char</div><span class="byte-viz__arrow">-></span><div class="byte-viz__chip">U+0041</div></div><div class="byte-viz__row"><div class="byte-viz__chip">0x41</div><span class="byte-viz__arrow">-></span><div class="byte-viz__chip">01000001</div></div><div class="byte-viz__bits"><span class="byte-viz__bit">0</span><span class="byte-viz__bit">1</span><span class="byte-viz__bit">0</span><span class="byte-viz__bit">0</span><span class="byte-viz__bit">0</span><span class="byte-viz__bit">0</span><span class="byte-viz__bit">0</span><span class="byte-viz__bit">1</span></div></div><div class="byte-viz__side"><div class="byte-viz__badge">bytes<strong>1</strong></div><div class="byte-viz__badge">planes<strong>BMP</strong></div><div class="byte-viz__badge">glyph<strong>paint</strong></div></div></div>
      </div>`;
  }

  const title = root.querySelector<HTMLElement>(".markdy-showcase__title");
  if (title) title.textContent = label;
  return root;
}

function ensureArchitectureStyles(doc: Document): void {
  if (doc.getElementById(ARCHITECTURE_STYLE_ID)) return;

  const style = doc.createElement("style");
  style.id = ARCHITECTURE_STYLE_ID;
  style.textContent = `
.markdy-arch-node {
  --markdy-node-accent: #38bdf8;
  --markdy-node-accent-2: #22c55e;
  --markdy-node-surface: rgba(15, 23, 42, 0.82);
  --markdy-node-border: rgba(148, 163, 184, 0.34);
  --markdy-node-glow: rgba(56, 189, 248, 0.24);
  position: relative;
  isolation: isolate;
  width: 184px;
  min-height: 88px;
  box-sizing: border-box;
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr);
  align-items: center;
  gap: 10px;
  padding: 13px 14px;
  border: 1px solid var(--markdy-node-border);
  border-radius: 14px;
  color: #e5eefb;
  background:
    linear-gradient(145deg, rgba(255, 255, 255, 0.15), rgba(255, 255, 255, 0.02) 34%, rgba(15, 23, 42, 0.88) 100%),
    radial-gradient(circle at 18% 0%, color-mix(in srgb, var(--markdy-node-accent) 34%, transparent), transparent 42%),
    var(--markdy-node-surface);
  box-shadow:
    0 16px 34px rgba(2, 6, 23, 0.28),
    0 0 0 1px rgba(255, 255, 255, 0.04) inset,
    0 1px 0 rgba(255, 255, 255, 0.12) inset,
    0 0 28px var(--markdy-node-glow);
  overflow: hidden;
  contain: layout paint style;
  backdrop-filter: blur(14px) saturate(1.18);
  -webkit-backdrop-filter: blur(14px) saturate(1.18);
}
.markdy-arch-node::before {
  content: "";
  position: absolute;
  inset: 0;
  z-index: -1;
  background:
    linear-gradient(90deg, transparent 0 24%, rgba(255, 255, 255, 0.06) 50%, transparent 76%) -180px 0 / 180px 100% no-repeat,
    repeating-linear-gradient(135deg, rgba(255, 255, 255, 0.055) 0 1px, transparent 1px 10px);
  opacity: 0.6;
}
.markdy-arch-node::after {
  content: "";
  position: absolute;
  left: 14px;
  right: 14px;
  bottom: 9px;
  height: 2px;
  border-radius: 999px;
  background: linear-gradient(90deg, transparent, var(--markdy-node-accent), var(--markdy-node-accent-2), transparent);
  opacity: 0.82;
  filter: drop-shadow(0 0 6px var(--markdy-node-accent));
}
.markdy-arch-node__icon {
  position: relative;
  width: 32px;
  height: 32px;
  border-radius: 11px;
  background:
    radial-gradient(circle at 35% 25%, rgba(255, 255, 255, 0.28), transparent 42%),
    linear-gradient(145deg, var(--markdy-node-accent), color-mix(in srgb, var(--markdy-node-accent) 38%, #020617));
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.16) inset,
    0 10px 20px color-mix(in srgb, var(--markdy-node-accent) 25%, transparent);
}
.markdy-arch-node__icon::before,
.markdy-arch-node__icon::after {
  content: "";
  position: absolute;
  box-sizing: border-box;
  border-color: rgba(255, 255, 255, 0.9);
}
.markdy-arch-node__label {
  min-width: 0;
  font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-size: 15px;
  font-weight: 720;
  line-height: 1.08;
  color: #f8fafc;
  text-shadow: 0 1px 12px rgba(15, 23, 42, 0.8);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.markdy-arch-node__type {
  display: block;
  margin-top: 5px;
  font-size: 9px;
  font-weight: 740;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--markdy-node-accent) 70%, #e2e8f0);
  opacity: 0.86;
}
.markdy-arch-node[data-markdy-system-type="service"],
.markdy-arch-node[data-markdy-system-type="api"],
.markdy-arch-node[data-markdy-system-type="microservice"] {
  --markdy-node-accent: #38bdf8;
  --markdy-node-accent-2: #818cf8;
}
.markdy-arch-node[data-markdy-system-type="client"],
.markdy-arch-node[data-markdy-system-type="user"] {
  --markdy-node-accent: #f59e0b;
  --markdy-node-accent-2: #fb7185;
}
.markdy-arch-node[data-markdy-system-type="database"],
.markdy-arch-node[data-markdy-system-type="db"] {
  --markdy-node-accent: #22c55e;
  --markdy-node-accent-2: #14b8a6;
  border-radius: 18px 18px 24px 24px;
}
.markdy-arch-node[data-markdy-system-type="cache"] {
  --markdy-node-accent: #a3e635;
  --markdy-node-accent-2: #22c55e;
  border-style: dashed;
}
.markdy-arch-node[data-markdy-system-type="queue"] {
  --markdy-node-accent: #a78bfa;
  --markdy-node-accent-2: #38bdf8;
}
.markdy-arch-node[data-markdy-system-type="cloud"],
.markdy-arch-node[data-markdy-system-type="region"] {
  --markdy-node-accent: #60a5fa;
  --markdy-node-accent-2: #67e8f9;
  border-radius: 999px;
}
.markdy-arch-node[data-markdy-system-type="container"],
.markdy-arch-node[data-markdy-system-type="cluster"] {
  --markdy-node-accent: #c084fc;
  --markdy-node-accent-2: #f472b6;
  border-radius: 10px;
}
.markdy-arch-node[data-markdy-system-type="service"] .markdy-arch-node__icon::before,
.markdy-arch-node[data-markdy-system-type="api"] .markdy-arch-node__icon::before,
.markdy-arch-node[data-markdy-system-type="microservice"] .markdy-arch-node__icon::before {
  inset: 9px 7px;
  border-top: 3px solid rgba(255, 255, 255, 0.92);
  border-bottom: 3px solid rgba(255, 255, 255, 0.92);
}
.markdy-arch-node[data-markdy-system-type="service"] .markdy-arch-node__icon::after,
.markdy-arch-node[data-markdy-system-type="api"] .markdy-arch-node__icon::after,
.markdy-arch-node[data-markdy-system-type="microservice"] .markdy-arch-node__icon::after {
  inset: 14px 7px auto;
  border-top: 3px solid rgba(255, 255, 255, 0.92);
}
.markdy-arch-node[data-markdy-system-type="client"] .markdy-arch-node__icon::before,
.markdy-arch-node[data-markdy-system-type="user"] .markdy-arch-node__icon::before {
  left: 8px;
  right: 8px;
  top: 8px;
  height: 13px;
  border: 2px solid rgba(255, 255, 255, 0.92);
  border-radius: 3px;
}
.markdy-arch-node[data-markdy-system-type="client"] .markdy-arch-node__icon::after,
.markdy-arch-node[data-markdy-system-type="user"] .markdy-arch-node__icon::after {
  left: 12px;
  right: 12px;
  bottom: 7px;
  border-top: 2px solid rgba(255, 255, 255, 0.92);
}
.markdy-arch-node[data-markdy-system-type="database"] .markdy-arch-node__icon::before,
.markdy-arch-node[data-markdy-system-type="db"] .markdy-arch-node__icon::before,
.markdy-arch-node[data-markdy-system-type="cache"] .markdy-arch-node__icon::before {
  inset: 7px 7px 9px;
  border: 2px solid rgba(255, 255, 255, 0.92);
  border-radius: 50% / 16%;
}
.markdy-arch-node[data-markdy-system-type="database"] .markdy-arch-node__icon::after,
.markdy-arch-node[data-markdy-system-type="db"] .markdy-arch-node__icon::after,
.markdy-arch-node[data-markdy-system-type="cache"] .markdy-arch-node__icon::after {
  left: 8px;
  right: 8px;
  top: 12px;
  border-top: 2px solid rgba(255, 255, 255, 0.72);
}
.markdy-arch-node[data-markdy-system-type="queue"] .markdy-arch-node__icon::before {
  inset: 9px 8px;
  border: 2px solid rgba(255, 255, 255, 0.92);
  border-radius: 999px;
}
.markdy-arch-node[data-markdy-system-type="queue"] .markdy-arch-node__icon::after {
  left: 13px;
  top: 9px;
  width: 8px;
  height: 14px;
  border-left: 2px solid rgba(255, 255, 255, 0.82);
  border-right: 2px solid rgba(255, 255, 255, 0.82);
}
.markdy-arch-node[data-markdy-system-type="cloud"] .markdy-arch-node__icon::before,
.markdy-arch-node[data-markdy-system-type="region"] .markdy-arch-node__icon::before {
  left: 7px;
  right: 7px;
  bottom: 9px;
  height: 12px;
  border: 2px solid rgba(255, 255, 255, 0.92);
  border-radius: 999px;
}
.markdy-arch-node[data-markdy-system-type="cloud"] .markdy-arch-node__icon::after,
.markdy-arch-node[data-markdy-system-type="region"] .markdy-arch-node__icon::after {
  left: 10px;
  top: 7px;
  width: 13px;
  height: 13px;
  border-top: 2px solid rgba(255, 255, 255, 0.92);
  border-left: 2px solid rgba(255, 255, 255, 0.92);
  border-radius: 999px 0 0 0;
}
.markdy-arch-node[data-markdy-system-type="container"] .markdy-arch-node__icon::before,
.markdy-arch-node[data-markdy-system-type="cluster"] .markdy-arch-node__icon::before {
  inset: 8px;
  border: 2px solid rgba(255, 255, 255, 0.92);
  border-radius: 4px;
}
.markdy-arch-node[data-markdy-system-type="container"] .markdy-arch-node__icon::after,
.markdy-arch-node[data-markdy-system-type="cluster"] .markdy-arch-node__icon::after {
  left: 10px;
  right: 10px;
  top: 14px;
  border-top: 2px solid rgba(255, 255, 255, 0.72);
}
`;
  doc.head.appendChild(style);
}

function isArchitectureNodeType(type: string): boolean {
  return ARCHITECTURE_NODE_TYPES.has(type);
}

function isShowcaseSurfaceType(type: string): boolean {
  return SHOWCASE_SURFACE_TYPES.has(type);
}

function architectureTypeLabel(type: string): string {
  if (type === "db") return "database";
  if (type === "api") return "service";
  return type;
}

// ---------------------------------------------------------------------------
// Actor element factory
// ---------------------------------------------------------------------------

export function createActorEl(
  name: string,
  def: ActorDef,
  assetDefs: SceneAST["assets"],
  assetOverrides: Record<string, string>,
): HTMLElement {
  let el: HTMLElement;

  switch (def.type) {
    case "sprite": {
      const assetName = def.args[0] ?? "";
      const assetDef = assetDefs[assetName];

      if (assetDef?.type === "icon") {
        const span = document.createElement("span");
        span.className = "iconify";
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
        img.style.maxWidth = "100%";
        img.style.maxHeight = "200px";
        img.style.objectFit = "contain";
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
      // color inherits from scene element which sets a bg-contrasting color
      el = div;
      break;
    }

    case "caption": {
      // Full-width overlay ribbon. Visually heavier than a plain text actor:
      // centered horizontally, bold, slightly shadowed. Positioning math
      // (x = scene width / 2) is done at parse time via the `at top|bottom|center`
      // anchor; here we just translate(-50%, -50%) to center on that point.
      const div = document.createElement("div");
      div.textContent = def.args[0] ?? "";
      div.dataset.markdyCaption = def.anchor ?? "top";
      Object.assign(div.style, {
        fontSize: `${def.size ?? 32}px`,
        fontFamily: "system-ui, -apple-system, sans-serif",
        fontWeight: "700",
        whiteSpace: "nowrap",
        textAlign: "center",
        lineHeight: "1.1",
        padding: "6px 14px",
        borderRadius: "4px",
        background: "rgba(0, 0, 0, 0.55)",
        color: "#fff",
        textShadow: "0 2px 6px rgba(0, 0, 0, 0.45)",
        userSelect: "none",
        pointerEvents: "none",
        // Center the caption on its (x, y) point (x = sceneWidth/2).
        // We combine translate-centering with the actor transform in the
        // dataset below so the player can re-apply on state changes.
      });
      el = div;
      break;
    }

    case "figure": {
      el = createFigureEl(def);
      break;
    }

    case "parking_map":
    case "ascii_map":
    case "game_scene":
    case "byte_viz": {
      el = createShowcaseSurfaceEl(def.type, def);
      break;
    }

    case "service":
    case "api":
    case "microservice":
    case "client":
    case "user":
    case "db":
    case "database":
    case "queue":
    case "cache":
    case "cloud":
    case "region":
    case "container":
    case "cluster": {
      ensureArchitectureStyles(document);
      const card = document.createElement("div");
      card.className = "markdy-arch-node";
      card.dataset.markdySystemType = def.type;
      card.setAttribute("role", "img");
      card.setAttribute("aria-label", `${architectureTypeLabel(def.type)} ${def.args[0] ?? name}`);

      const icon = document.createElement("span");
      icon.className = "markdy-arch-node__icon";
      icon.setAttribute("aria-hidden", "true");

      const label = document.createElement("div");
      label.className = "markdy-arch-node__label";
      label.textContent = def.args[0] ?? "";
      label.style.fontSize = `${def.size ?? 15}px`;

      const typeLabel = document.createElement("span");
      typeLabel.className = "markdy-arch-node__type";
      typeLabel.textContent = architectureTypeLabel(def.type);
      label.appendChild(typeLabel);

      card.appendChild(icon);
      card.appendChild(label);
      el = card;
      break;
    }

    default: {
      // box
      const div = document.createElement("div");
      div.style.width  = "100px";
      div.style.height = "100px";
      div.style.background = "#999";
      div.style.boxSizing  = "border-box";
      el = div;
      break;
    }
  }

  el.dataset.markdyActor = name;
  el.style.position = "absolute";
  el.style.left = "0";
  el.style.top = "0";
  el.style.transformOrigin = "center center";
  el.style.transform = def.type === "caption" ? txCaption(stateFrom(def)) : tx(stateFrom(def));
  el.style.opacity = String(def.opacity ?? 1);
  if (def.z !== undefined) el.style.zIndex = String(def.z);
  else if (def.type === "caption") el.style.zIndex = "100";
  else if (isShowcaseSurfaceType(def.type)) el.style.zIndex = "25";
  else if (isArchitectureNodeType(def.type)) el.style.zIndex = "10";

  return el;
}

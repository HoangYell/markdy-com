import type { ActorDef } from "@markdy/core";

// ---------------------------------------------------------------------------
// Stick-figure DOM factory
// ---------------------------------------------------------------------------
//
// Each limb element carries a data-fig-* attribute so the renderer can
// query it for per-part animations.  Named parts:
//
//   data-fig-head     — circle head
//   data-fig-face     — emoji face span (inside head)
//   data-fig-body     — torso emoji (inside shirt row)
//   data-fig-arm-l    — left arm  (pivot: shoulder / right end)
//   data-fig-arm-r    — right arm (pivot: shoulder / left end)
//   data-fig-leg-l    — left leg  (pivot: hip / top end)
//   data-fig-leg-r    — right leg (pivot: hip / top end)
//   data-fig-shoulder-l — left shoulder joint
//   data-fig-shoulder-r — right shoulder joint
//   data-fig-hip-l    — left hip joint
//   data-fig-hip-r    — right hip joint
//
// DSL syntax:
//   actor a = figure(#c68642)           at (x,y)   — male, default face 😶
//   actor b = figure(#fad4c0, f)        at (x,y)   — female (skirt + bun)
//   actor c = figure(#c68642, m, 😎)   at (x,y)   — custom starting face

export function createFigureEl(def: ActorDef): HTMLElement {
  const skinColor = def.args[0] || "#ffdbac";
  const isFemale  = def.args[1] === "f";
  const startFace = def.args[2] || (isFemale ? "🙂" : "😶");
  // Use currentColor so leg sticks inherit the scene's text color
  // (dark on light backgrounds, light on dark backgrounds)
  const ink = "currentColor";

  const WRAP_W   = 80;
  const FACE_FS  = 40;
  const SHIRT_FS = isFemale ? 48 : 44;
  // Estimated visual shirt width ≈ 90% of font-size on most platforms
  const vShirtW  = SHIRT_FS * 0.9;
  // Shoulder x within the shirt row div (centred at WRAP_W/2)
  const shLx = (WRAP_W - vShirtW) / 2 + vShirtW * 0.18; // left shoulder
  const shRx = WRAP_W - shLx;                             // right shoulder
  const shY  = Math.round(SHIRT_FS * 0.28);               // shoulder depth from shirt top
  const ARM_W = 36, ARM_H = 22;
  const LEG_H = 54, LEG_STICK_H = 34;

  // Joint sizing
  const JOINT_SIZE = 6;

  // ── Wrap: flex column, centred  ───────────────────────────────────────────
  const wrap = document.createElement("div");
  Object.assign(wrap.style, {
    position:      "relative",
    display:       "flex",
    flexDirection: "column",
    alignItems:    "center",
    width:         `${WRAP_W}px`,
    overflow:      "visible",
  });

  // ── 1. Face ───────────────────────────────────────────────────────────────
  const faceEl = document.createElement("span");
  (faceEl.dataset as Record<string, string>).figFace = "";
  (faceEl.dataset as Record<string, string>).figHead = "";
  faceEl.textContent = startFace;
  Object.assign(faceEl.style, {
    fontSize:      `${FACE_FS}px`,
    lineHeight:    "1",
    flexShrink:    "0",
    userSelect:    "none",
    pointerEvents: "none",
    zIndex:        "5",
  });

  // ── 2. Neck (skin-coloured bridge, overlaps slightly with face & shirt) ───
  const neck = document.createElement("div");
  Object.assign(neck.style, {
    width:        "10px",
    height:       "10px",
    background:   skinColor,
    borderRadius: "4px",
    flexShrink:   "0",
    marginTop:    "-3px",
    marginBottom: "-3px",
    zIndex:       "4",
  });

  // ── 3. Shirt row — arms are children so they always attach to the shirt ───
  const shirtRow = document.createElement("div");
  Object.assign(shirtRow.style, {
    position:   "relative",
    width:      `${WRAP_W}px`,
    height:     `${SHIRT_FS}px`,
    textAlign:  "center",
    flexShrink: "0",
    zIndex:     "2",
    overflow:   "visible",
  });

  const torso = document.createElement("span");
  (torso.dataset as Record<string, string>).figBody = "";
  torso.textContent = isFemale ? "👗" : "👕";
  Object.assign(torso.style, {
    fontSize:      `${SHIRT_FS}px`,
    lineHeight:    "1",
    userSelect:    "none",
    pointerEvents: "none",
  });
  shirtRow.appendChild(torso);

  // ── Shoulder joints ──────────────────────────────────────────────────────
  const shoulderL = buildJoint("left", skinColor, JOINT_SIZE, shLx, shY, WRAP_W);
  const shoulderR = buildJoint("right", skinColor, JOINT_SIZE, shRx, shY, WRAP_W);
  (shoulderL.dataset as Record<string, string>).figShoulderL = "";
  (shoulderR.dataset as Record<string, string>).figShoulderR = "";
  shirtRow.appendChild(shoulderL);
  shirtRow.appendChild(shoulderR);

  // ── Arms ──────────────────────────────────────────────────────────────────
  const armHandEmoji = isFemale ? "💅" : "🤜";

  shirtRow.appendChild(
    buildArm("left", armHandEmoji, skinColor, {
      w: ARM_W, h: ARM_H,
      anchorX: WRAP_W - shLx,
      anchorY: shY,
      restDeg: 20,
      flipFist: !isFemale,
    }),
  );
  shirtRow.appendChild(
    buildArm("right", armHandEmoji, skinColor, {
      w: ARM_W, h: ARM_H,
      anchorX: shRx,
      anchorY: shY,
      restDeg: -20,
      flipFist: false,
    }),
  );

  // ── 4. Hip row — contains hip joints + legs ──────────────────────────────
  const hipRow = document.createElement("div");
  Object.assign(hipRow.style, {
    position:   "relative",
    display:    "flex",
    flexDirection: "column",
    alignItems: "center",
    flexShrink: "0",
    overflow:   "visible",
  });

  // Hip bridge (skin-coloured connector between torso and legs)
  const hipBridge = document.createElement("div");
  Object.assign(hipBridge.style, {
    width:        "28px",
    height:       "4px",
    background:   skinColor,
    borderRadius: "2px",
    marginBottom: "1px",
    zIndex:       "3",
  });
  hipRow.appendChild(hipBridge);

  // Legs container
  const legsRow = document.createElement("div");
  Object.assign(legsRow.style, {
    display:        "flex",
    justifyContent: "center",
    gap:            "10px",
    flexShrink:     "0",
    overflow:       "visible",
    position:       "relative",
  });

  const legL = buildLeg(true, isFemale, ink, skinColor, LEG_H, LEG_STICK_H, JOINT_SIZE);
  const legR = buildLeg(false, isFemale, ink, skinColor, LEG_H, LEG_STICK_H, JOINT_SIZE);
  legsRow.append(legL, legR);
  hipRow.appendChild(legsRow);

  wrap.append(faceEl, neck, shirtRow, hipRow);
  return wrap;
}

// ---------------------------------------------------------------------------
// Joint builder (shoulder / hip circle)
// ---------------------------------------------------------------------------

function buildJoint(
  side: "left" | "right",
  skinColor: string,
  size: number,
  anchorX: number,
  anchorY: number,
  wrapW: number,
): HTMLElement {
  const joint = document.createElement("div");
  const isLeft = side === "left";

  Object.assign(joint.style, {
    position:     "absolute",
    width:        `${size}px`,
    height:       `${size}px`,
    borderRadius: "50%",
    background:   skinColor,
    ...(isLeft
      ? { right: `${wrapW - anchorX - size / 2}px` }
      : { left:  `${anchorX - size / 2}px` }),
    top:          `${anchorY - size / 2}px`,
    zIndex:       "5",
    pointerEvents: "none",
  });

  return joint;
}

// ---------------------------------------------------------------------------
// Arm builder (extracted to eliminate left/right duplication)
// ---------------------------------------------------------------------------

interface ArmGeometry {
  w: number;
  h: number;
  anchorX: number;
  anchorY: number;
  restDeg: number;
  flipFist: boolean;
}

function buildArm(
  side: "left" | "right",
  handEmoji: string,
  skinColor: string,
  g: ArmGeometry,
): HTMLElement {
  const arm = document.createElement("div");
  const ds = arm.dataset as Record<string, string>;
  ds[side === "left" ? "figArmL" : "figArmR"] = "";

  const isLeft = side === "left";
  const origin = isLeft ? "right center" : "left center";

  Object.assign(arm.style, {
    position:        "absolute",
    width:           `${g.w}px`,
    height:          `${g.h}px`,
    ...(isLeft
      ? { right: `${g.anchorX}px` }
      : { left:  `${g.anchorX}px` }),
    top:             `${g.anchorY - g.h / 2}px`,
    transformOrigin: origin,
    transform:       `rotate(${g.restDeg}deg)`,
    zIndex:          "4",
    overflow:        "visible",
  });

  // Upper arm stick (skin-coloured, connects shoulder to hand)
  const stick = document.createElement("div");
  Object.assign(stick.style, {
    position:     "absolute",
    ...(isLeft ? { right: "5px" } : { left: "5px" }),
    top:          `${g.h / 2 - 2}px`,
    width:        "18px",
    height:       "4px",
    background:   skinColor,
    borderRadius: "2px",
  });

  const fist = document.createElement("span");
  fist.textContent = handEmoji;
  Object.assign(fist.style, {
    position:      "absolute",
    fontSize:      "17px",
    lineHeight:    "1",
    ...(isLeft ? { left: "0" } : { right: "0" }),
    top:           `${g.h / 2 - 10}px`,
    ...(g.flipFist ? { transform: "scaleX(-1)" } : {}),
    userSelect:    "none",
    pointerEvents: "none",
  });

  arm.append(stick, fist);
  return arm;
}

// ---------------------------------------------------------------------------
// Leg builder
// ---------------------------------------------------------------------------

function buildLeg(
  isLeft: boolean,
  isFemale: boolean,
  ink: string,
  skinColor: string,
  legH: number,
  stickH: number,
  jointSize: number,
): HTMLElement {
  const leg = document.createElement("div");
  const ds = leg.dataset as Record<string, string>;
  ds[isLeft ? "figLegL" : "figLegR"] = "";

  Object.assign(leg.style, {
    position:        "relative",
    width:           "20px",
    height:          `${legH}px`,
    transformOrigin: "top center",
    transform:       "rotate(0deg)",
    overflow:        "visible",
  });

  // Hip joint circle at top of leg
  const hipJoint = document.createElement("div");
  (hipJoint.dataset as Record<string, string>)[isLeft ? "figHipL" : "figHipR"] = "";
  Object.assign(hipJoint.style, {
    position:      "absolute",
    width:         `${jointSize}px`,
    height:        `${jointSize}px`,
    borderRadius:  "50%",
    background:    skinColor,
    left:          "50%",
    top:           `-${jointSize / 2}px`,
    transform:     "translateX(-50%)",
    zIndex:        "3",
    pointerEvents: "none",
  });

  // Leg stick (dark, represents pants/legs)
  const stick = document.createElement("div");
  Object.assign(stick.style, {
    position:     "absolute",
    width:        "4px",
    height:       `${stickH}px`,
    background:   ink,
    borderRadius: "2px",
    left:         "50%",
    top:          "0",
    transform:    "translateX(-50%)",
  });

  // Knee joint (small dot midway)
  const knee = document.createElement("div");
  Object.assign(knee.style, {
    position:      "absolute",
    width:         "4px",
    height:        "4px",
    borderRadius:  "50%",
    background:    skinColor,
    left:          "50%",
    top:           `${stickH * 0.55}px`,
    transform:     "translateX(-50%)",
    zIndex:        "2",
    pointerEvents: "none",
  });

  const shoe = document.createElement("span");
  shoe.textContent = isFemale ? "👠" : "👟";
  Object.assign(shoe.style, {
    position:      "absolute",
    fontSize:      "17px",
    lineHeight:    "1",
    bottom:        "0",
    userSelect:    "none",
    pointerEvents: "none",
  });

  if (isLeft) {
    shoe.style.left      = "0";
    shoe.style.transform = "scaleX(-1)";
  } else {
    shoe.style.right = "0";
  }

  leg.append(hipJoint, stick, knee, shoe);
  return leg;
}

// ---------------------------------------------------------------------------
// Part selector map (for rotate_part / pose)
// ---------------------------------------------------------------------------

export const PART_SEL: Record<string, string> = {
  head:       "[data-fig-head]",
  face:       "[data-fig-face]",
  body:       "[data-fig-body]",
  arm_left:   "[data-fig-arm-l]",
  arm_right:  "[data-fig-arm-r]",
  leg_left:   "[data-fig-leg-l]",
  leg_right:  "[data-fig-leg-r]",
};

/** Read the current rotate(Xdeg) value from an element's inline transform. */
export function readRotation(el: HTMLElement): number {
  const m = /rotate\((-?[\d.]+)deg\)/.exec(el.style.transform ?? "");
  return m ? Number(m[1]) : 0;
}

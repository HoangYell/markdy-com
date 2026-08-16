---
name: markdy-visual-capture
description: >-
  Capture, scrub, and generate publication-ready, mascot-decorated landscape diagrams for Markdy documentation, marketing, social media, and blog posts using Chrome headless automation.
---

# Markdy Visual Capture & Mascot Decoration Skill

This skill teaches the agent how to capture crisp 2× Retina screenshots from the live Markdy studio / playground (`http://markdy.com/playground/` or local dev server) and decorate them into landscape (16:9 widescreen, 1600×900) documentation assets matching the `og-markdy.png` aesthetic.

---

## 🎨 Visual Composition Rules

1. **Landscape 16:9 Format**: All documentation images must use `1600×900` px rendered at `deviceScaleFactor: 2` (3200×1800 virtual resolution) and saved as optimized `.webp`.
2. **Dominant Main Window**: The main diagram window card takes up ~95% of the canvas width, framed with a clean macOS titlebar (🔴 🟡 🟢 traffic light dots and scene tags).
3. **Mascot Placement**: The cute Markdy axolotl mascot (`docs/images/mascot/markdy.png`) sits at the **bottom-right corner**, naturally overlapping the frame without obscuring key diagram nodes.
4. **Speech Bubble Explanations**: Positioned directly above the mascot, providing concise, human-readable explanations of the architectural mechanics (e.g. *how Redis caches slugs in under 2ms*, *how Kubernetes Ingress terminates TLS*).
5. **3D Icon Pinned Sticky Note**: An enlarged yellow sticky note is positioned at the **bottom-left corner**, pinned at its top-left by the 3D glossy Markdy hexagon icon (`docs/images/mascot/3d-icon.png`).
6. **No Center Link Distractions**: Do NOT draw heavy magical beams or lines crossing over the diagram content. The diagram must remain clear, sharp, and dominant.
7. **Brand Top Bar**: Sleek header with the 3D Markdy icon, `Markdy.com` logo, and 3D architectural pattern badges.

---

## 🛠️ Step-by-Step Execution Workflow

### Step 1: Capture Raw Playground Scenes

To capture clean diagram scenes from `http://markdy.com/playground/`:

```bash
node .agents/skills/markdy-visual-capture/scripts/capture-playground-scenes.mjs
```

This script:
- Connects to Google Chrome headless.
- Switches the playground to canvas-only view (`#view-canvas-btn`).
- Iterates through the dropdown examples (`#quick-example-select`).
- Scrubs the timeline slider (`#timeline-range`) to `80%` progress so flow edges, requests, and active cues are visible.
- Triggers auto-zoom centering (`#canvas-zoom-fit-btn`).
- Saves raw `.webp` captures in `tmp/raw-captures/`.

### Step 2: Decorate with Mascot & Annotations

To apply the mascot, 3D pin note, speech bubble, and landscape frame across all scenes:

```bash
node scripts/generate-all-decorated-images.mjs
```

This script reads raw captures from `tmp/raw-captures/` and writes decorated landscape images to:
- `docs/images/*.webp`
- `website/public/images/*.webp`

---

## 📁 Key File Locations

- **Mascot Artwork**: `docs/images/mascot/markdy.png` (Transparent high-res axolotl with wand)
- **3D Pin Icon**: `docs/images/mascot/3d-icon.png` (Glossy 3D green hexagon 'M' icon)
- **Brand SVG**: `docs/images/mascot/icon.svg`
- **Output Directories**: `docs/images/` and `website/public/images/`
- **Raw Captures Cache**: `tmp/raw-captures/`

---

## 💡 Adding a New Diagram Scene

When adding a new diagram scene to documentation:

1. Add the scene metadata entry in `scripts/generate-all-decorated-images.mjs`:
   ```javascript
   {
     file: 'scene-my-new-architecture.webp',
     title: 'My New Architecture Title',
     sceneTag: 'scene "My Scene" theme=paper',
     stickyNote: '📌 <b>How it works:</b><br/>• Step 1...<br/>• Step 2...',
     explanation: '<b>Architecture Overview:</b><br/>Explaining how the components communicate in real time! 🚀',
     badge1: '⚡ High Performance',
     badge2: '🛡️ Zero Trust',
   }
   ```
2. Run `node scripts/generate-all-decorated-images.mjs`.
3. Verify the generated image at `docs/images/scene-my-new-architecture.webp`.

import {
  createDiagram,
  exportDiagramAsVectorSvg,
  exportDiagramAsPng,
  type Diagram,
} from "@markdy/renderer-dom";
import { parse, ParseError } from "@markdy/core";

declare function acquireVsCodeApi(): {
  postMessage: (msg: any) => void;
  setState: (state: any) => void;
  getState: () => any;
};

const vscode = typeof acquireVsCodeApi === "function" ? acquireVsCodeApi() : null;

let currentDiagram: Diagram | null = null;
let currentCode = "";
let currentThemeOverride: string | null = null;
let isPlaying = true;

const container = document.getElementById("diagram-mount");
const errorOverlay = document.getElementById("error-overlay");
const errorMessage = document.getElementById("error-message");
const playPauseBtn = document.getElementById("btn-play-pause");
const themeSelect = document.getElementById("theme-select") as HTMLSelectElement | null;

function showError(msg: string, line?: number) {
  if (!errorOverlay || !errorMessage) return;
  const lineText = line ? ` (Line ${line})` : "";
  errorMessage.textContent = `${msg}${lineText}`;
  errorOverlay.classList.remove("hidden");
}

function hideError() {
  if (!errorOverlay) return;
  errorOverlay.classList.add("hidden");
}

function renderCode(code: string, options: { theme?: string; autoplay?: boolean; loop?: boolean; progressBar?: boolean } = {}) {
  if (!container) return;
  currentCode = code;

  try {
    // Validate AST first
    parse(code);
    hideError();
  } catch (err: any) {
    if (err instanceof ParseError) {
      showError(err.message, err.line);
    } else {
      showError(String(err.message || err));
    }
    return;
  }

  try {
    if (currentDiagram) {
      currentDiagram.destroy();
      currentDiagram = null;
    }
    container.innerHTML = "";

    const selectedTheme = currentThemeOverride || (themeSelect ? themeSelect.value : undefined);

    let effectiveCode = code;
    if (selectedTheme && selectedTheme !== "auto" && !/theme\s*=\s*"\w+"/.test(code)) {
      effectiveCode = `theme "${selectedTheme}"\n` + code;
    }

    currentDiagram = createDiagram({
      container,
      code: effectiveCode,
      autoplay: options.autoplay ?? isPlaying,
      loop: options.loop ?? true,
      progressBar: options.progressBar ?? true,
      copyright: false,
    });

    if (playPauseBtn) {
      playPauseBtn.textContent = isPlaying ? "⏸ Pause" : "▶ Play";
    }
  } catch (err: any) {
    showError(`Render error: ${err.message || err}`);
  }
}

// Global controls
window.addEventListener("message", async (event) => {
  const message = event.data;
  switch (message.type) {
    case "update":
      renderCode(message.code, message.options);
      break;

    case "exportSvg":
      try {
        if (!container) throw new Error("Preview container not initialized");
        const svgString = exportDiagramAsVectorSvg(container);
        if (vscode) {
          vscode.postMessage({ type: "svgExportReady", data: svgString });
        }
      } catch (err: any) {
        if (vscode) {
          vscode.postMessage({ type: "exportError", message: err.message || String(err) });
        }
      }
      break;

    case "exportPng":
      try {
        if (!container) throw new Error("Preview container not initialized");
        const pngBlob = await exportDiagramAsPng(container, { pixelRatio: 2 });
        const reader = new FileReader();
        reader.onloadend = () => {
          if (vscode) {
            vscode.postMessage({ type: "pngExportReady", dataUrl: reader.result });
          }
        };
        reader.readAsDataURL(pngBlob);
      } catch (err: any) {
        if (vscode) {
          vscode.postMessage({ type: "exportError", message: err.message || String(err) });
        }
      }
      break;

    case "togglePlay":
      if (currentDiagram) {
        if (isPlaying) {
          currentDiagram.pause();
          isPlaying = false;
        } else {
          currentDiagram.play();
          isPlaying = true;
        }
        if (playPauseBtn) {
          playPauseBtn.textContent = isPlaying ? "⏸ Pause" : "▶ Play";
        }
      }
      break;

    case "restart":
      if (currentDiagram) {
        currentDiagram.seek(0);
        currentDiagram.play();
        isPlaying = true;
        if (playPauseBtn) {
          playPauseBtn.textContent = "⏸ Pause";
        }
      }
      break;

    case "themeOverride":
      currentThemeOverride = message.theme === "auto" ? null : message.theme;
      if (themeSelect) {
        themeSelect.value = message.theme;
      }
      renderCode(currentCode);
      break;
  }
});

// UI Event listeners
if (playPauseBtn) {
  playPauseBtn.addEventListener("click", () => {
    if (currentDiagram) {
      if (isPlaying) {
        currentDiagram.pause();
        isPlaying = false;
        playPauseBtn.textContent = "▶ Play";
      } else {
        currentDiagram.play();
        isPlaying = true;
        playPauseBtn.textContent = "⏸ Pause";
      }
    }
  });
}

const restartBtn = document.getElementById("btn-restart");
if (restartBtn) {
  restartBtn.addEventListener("click", () => {
    if (currentDiagram) {
      currentDiagram.seek(0);
      currentDiagram.play();
      isPlaying = true;
      if (playPauseBtn) playPauseBtn.textContent = "⏸ Pause";
    }
  });
}

if (themeSelect) {
  themeSelect.addEventListener("change", () => {
    currentThemeOverride = themeSelect.value === "auto" ? null : themeSelect.value;
    renderCode(currentCode);
  });
}

const exportSvgBtn = document.getElementById("btn-export-svg");
if (exportSvgBtn) {
  exportSvgBtn.addEventListener("click", () => {
    if (vscode) {
      vscode.postMessage({ type: "requestExportSvg" });
    }
  });
}

const exportPngBtn = document.getElementById("btn-export-png");
if (exportPngBtn) {
  exportPngBtn.addEventListener("click", () => {
    if (vscode) {
      vscode.postMessage({ type: "requestExportPng" });
    }
  });
}

// Ready signal
if (vscode) {
  vscode.postMessage({ type: "ready" });
}

import {
  createDiagram,
  exportDiagramAsVectorSvg,
  exportDiagramAsPng,
  exportDiagramAsGif,
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
let currentSpeed = 1.0;
let isPlaying = true;

const container = document.getElementById("diagram-mount");
const errorOverlay = document.getElementById("error-overlay");
const errorMessage = document.getElementById("error-message");
const loadingOverlay = document.getElementById("loading-overlay");
const loadingMessage = document.getElementById("loading-message");
const playPauseBtn = document.getElementById("btn-play-pause");
const restartBtn = document.getElementById("btn-restart");
const prevBeatBtn = document.getElementById("btn-prev-beat");
const nextBeatBtn = document.getElementById("btn-next-beat");
const speedSelect = document.getElementById("speed-select") as HTMLSelectElement | null;
const themeSelect = document.getElementById("theme-select") as HTMLSelectElement | null;
const exportSvgBtn = document.getElementById("btn-export-svg");
const exportPngBtn = document.getElementById("btn-export-png");
const exportGifBtn = document.getElementById("btn-export-gif");
const copySvgBtn = document.getElementById("btn-copy-svg");
const copyPngBtn = document.getElementById("btn-copy-png");

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

function showLoading(msg: string) {
  if (!loadingOverlay || !loadingMessage) return;
  loadingMessage.textContent = msg;
  loadingOverlay.classList.remove("hidden");
}

function hideLoading() {
  if (!loadingOverlay) return;
  loadingOverlay.classList.add("hidden");
}

function renderCode(code: string, options: { theme?: string; autoplay?: boolean; loop?: boolean; progressBar?: boolean } = {}) {
  if (!container) return;
  currentCode = code;

  try {
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

    const selectedTheme = currentThemeOverride || (themeSelect ? themeSelect.value : options.theme);

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

    if (currentSpeed !== 1.0) {
      currentDiagram.setPlaybackRate(currentSpeed);
    }

    if (playPauseBtn) {
      playPauseBtn.textContent = isPlaying ? "⏸ Pause" : "▶ Play";
    }
  } catch (err: any) {
    showError(`Render error: ${err.message || err}`);
  }
}

// Global controls & messages from VS Code extension host
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

    case "exportGif":
      try {
        if (!container || !currentDiagram) throw new Error("Diagram not ready for GIF export");
        showLoading("Recording & encoding animated GIF...");
        const gifBlob = await exportDiagramAsGif(container, currentDiagram, { fps: 12, pixelRatio: 2 });
        hideLoading();
        const reader = new FileReader();
        reader.onloadend = () => {
          if (vscode) {
            vscode.postMessage({ type: "gifExportReady", dataUrl: reader.result });
          }
        };
        reader.readAsDataURL(gifBlob);
      } catch (err: any) {
        hideLoading();
        if (vscode) {
          vscode.postMessage({ type: "exportError", message: err.message || String(err) });
        }
      }
      break;

    case "copySvg":
      try {
        if (!container) throw new Error("Preview container not initialized");
        const svgString = exportDiagramAsVectorSvg(container);
        if (vscode) {
          vscode.postMessage({ type: "svgCopied", data: svgString });
        }
      } catch (err: any) {
        if (vscode) {
          vscode.postMessage({ type: "exportError", message: err.message || String(err) });
        }
      }
      break;

    case "copyPng":
      try {
        if (!container) throw new Error("Preview container not initialized");
        const pngBlob = await exportDiagramAsPng(container, { pixelRatio: 2 });
        const reader = new FileReader();
        reader.onloadend = () => {
          if (vscode) {
            vscode.postMessage({ type: "pngCopied", dataUrl: reader.result });
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

if (prevBeatBtn) {
  prevBeatBtn.addEventListener("click", () => {
    if (currentDiagram) {
      currentDiagram.prevBeat();
    }
  });
}

if (nextBeatBtn) {
  nextBeatBtn.addEventListener("click", () => {
    if (currentDiagram) {
      currentDiagram.nextBeat();
    }
  });
}

if (speedSelect) {
  speedSelect.addEventListener("change", () => {
    currentSpeed = parseFloat(speedSelect.value) || 1.0;
    if (currentDiagram) {
      currentDiagram.setPlaybackRate(currentSpeed);
    }
  });
}

if (themeSelect) {
  themeSelect.addEventListener("change", () => {
    currentThemeOverride = themeSelect.value === "auto" ? null : themeSelect.value;
    renderCode(currentCode);
  });
}

if (exportSvgBtn) {
  exportSvgBtn.addEventListener("click", () => {
    if (vscode) {
      vscode.postMessage({ type: "requestExportSvg" });
    }
  });
}

if (exportPngBtn) {
  exportPngBtn.addEventListener("click", () => {
    if (vscode) {
      vscode.postMessage({ type: "requestExportPng" });
    }
  });
}

if (exportGifBtn) {
  exportGifBtn.addEventListener("click", () => {
    if (vscode) {
      vscode.postMessage({ type: "requestExportGif" });
    }
  });
}

if (copySvgBtn) {
  copySvgBtn.addEventListener("click", () => {
    if (vscode) {
      vscode.postMessage({ type: "requestCopySvg" });
    }
  });
}

if (copyPngBtn) {
  copyPngBtn.addEventListener("click", () => {
    if (vscode) {
      vscode.postMessage({ type: "requestCopyPng" });
    }
  });
}

// Ready signal
if (vscode) {
  vscode.postMessage({ type: "ready" });
}

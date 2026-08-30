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
let lastErrorLine: number | undefined;

const container = document.getElementById("diagram-mount");
const errorOverlay = document.getElementById("error-overlay");
const errorMessage = document.getElementById("error-message");
const loadingOverlay = document.getElementById("loading-overlay");
const loadingMessage = document.getElementById("loading-message");
const playPauseBtn = document.getElementById("btn-play-pause");
const restartBtn = document.getElementById("btn-restart");
const prevBeatBtn = document.getElementById("btn-prev-beat");
const nextBeatBtn = document.getElementById("btn-next-beat");
const fitViewBtn = document.getElementById("btn-fit-view");
const speedSelect = document.getElementById("speed-select") as HTMLSelectElement | null;
const themeSelect = document.getElementById("theme-select") as HTMLSelectElement | null;
const exportSvgBtn = document.getElementById("btn-export-svg");
const exportPngBtn = document.getElementById("btn-export-png");
const exportGifBtn = document.getElementById("btn-export-gif");
const copySvgBtn = document.getElementById("btn-copy-svg");
const copyPngBtn = document.getElementById("btn-copy-png");

function showError(msg: string, line?: number) {
  if (!errorOverlay || !errorMessage) return;
  lastErrorLine = line;
  const lineText = line ? ` (Line ${line} - click to jump)` : "";
  errorMessage.textContent = `${msg}${lineText}`;
  errorOverlay.classList.remove("hidden");
}

function hideError() {
  if (!errorOverlay) return;
  lastErrorLine = undefined;
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

    currentDiagram = createDiagram({
      container,
      code,
      autoplay: options.autoplay ?? isPlaying,
      loop: options.loop ?? true,
      progressBar: options.progressBar ?? true,
      copyright: false,
    });

    const selectedTheme = currentThemeOverride || (themeSelect && themeSelect.value !== "auto" ? themeSelect.value : (options.theme && options.theme !== "auto" ? options.theme : null));
    if (selectedTheme) {
      currentDiagram.setTheme(selectedTheme);
    }

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
        if (!container) throw new Error("Preview container not initialized");
        if (!currentDiagram) throw new Error("Diagram not initialized");
        showLoading("Recording animated GIF...");
        const gifBlob = await exportDiagramAsGif(container, currentDiagram, {
          fps: 20,
          pixelRatio: 2.0,
          dither: false,
          onProgress: (_prog, frame, total) => {
            showLoading(`Recording GIF frame ${frame}/${total}...`);
          },
        });
        const reader = new FileReader();
        reader.onloadend = () => {
          hideLoading();
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
      if (currentDiagram && currentThemeOverride) {
        currentDiagram.setTheme(currentThemeOverride);
      } else {
        renderCode(currentCode);
      }
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

if (fitViewBtn) {
  fitViewBtn.addEventListener("click", () => {
    renderCode(currentCode);
  });
}

if (errorOverlay) {
  errorOverlay.addEventListener("click", () => {
    if (lastErrorLine && vscode) {
      vscode.postMessage({ type: "revealLine", line: lastErrorLine });
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
    if (currentDiagram && currentThemeOverride) {
      currentDiagram.setTheme(currentThemeOverride);
    } else {
      renderCode(currentCode);
    }
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

// Global Keyboard Shortcuts inside Webview
window.addEventListener("keydown", (e) => {
  const activeTag = document.activeElement?.tagName.toLowerCase();
  if (activeTag === "input" || activeTag === "textarea" || activeTag === "select") {
    return;
  }

  switch (e.key) {
    case " ":
    case "k":
      e.preventDefault();
      if (currentDiagram) {
        if (isPlaying) {
          currentDiagram.pause();
          isPlaying = false;
          if (playPauseBtn) playPauseBtn.textContent = "▶ Play";
        } else {
          currentDiagram.play();
          isPlaying = true;
          if (playPauseBtn) playPauseBtn.textContent = "⏸ Pause";
        }
      }
      break;

    case "r":
    case "R":
      if (currentDiagram) {
        currentDiagram.seek(0);
        currentDiagram.play();
        isPlaying = true;
        if (playPauseBtn) playPauseBtn.textContent = "⏸ Pause";
      }
      break;

    case "ArrowLeft":
    case "j":
    case "J":
      if (currentDiagram) {
        currentDiagram.prevBeat();
      }
      break;

    case "ArrowRight":
    case "l":
    case "L":
      if (currentDiagram) {
        currentDiagram.nextBeat();
      }
      break;

    case "f":
    case "F":
      renderCode(currentCode);
      break;

    case "s":
    case "S":
      if (speedSelect) {
        const speeds = ["0.5", "1.0", "1.5", "2.0"];
        const nextIdx = (speeds.indexOf(speedSelect.value) + 1) % speeds.length;
        speedSelect.value = speeds[nextIdx];
        currentSpeed = parseFloat(speedSelect.value) || 1.0;
        if (currentDiagram) {
          currentDiagram.setPlaybackRate(currentSpeed);
        }
      }
      break;

    case "t":
    case "T":
      if (themeSelect) {
        const themes = ["auto", "midnight", "paper", "blueprint", "nebula", "editorial", "graphite", "terminal", "sketchy", "doodle"];
        const nextIdx = (themes.indexOf(themeSelect.value) + 1) % themes.length;
        themeSelect.value = themes[nextIdx];
        currentThemeOverride = themeSelect.value === "auto" ? null : themeSelect.value;
        if (currentDiagram && currentThemeOverride) {
          currentDiagram.setTheme(currentThemeOverride);
        } else {
          renderCode(currentCode);
        }
      }
      break;
  }
});

// Ready signal
if (vscode) {
  vscode.postMessage({ type: "ready" });
}

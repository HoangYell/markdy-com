/**
 * packages/renderer-dom/src/presentation-controller.ts
 * Interactive Beat Navigation & Keyboard-driven presentation controller.
 * Zero external dependencies.
 */

import type { Diagram } from "./diagram.js";
import type { RenderPlan } from "@markdy/core";

export interface ControllerOptions {
  enableKeyboard?: boolean;
  onBeatChange?: (beatName: string, index: number) => void;
}

export class DiagramPresentationController {
  private diagram: Diagram;
  private plan: RenderPlan;
  private currentBeatIndex = 0;

  constructor(diagram: Diagram, plan: RenderPlan, options: ControllerOptions = {}) {
    this.diagram = diagram;
    this.plan = plan;

    if (options.enableKeyboard !== false && typeof window !== "undefined") {
      this.attachKeyboardListener();
    }
  }

  public nextBeat(): void {
    if (this.currentBeatIndex < this.plan.beats.length - 1) {
      this.currentBeatIndex++;
      const beat = this.plan.beats[this.currentBeatIndex];
      this.diagram.seek(beat.start);
    }
  }

  public prevBeat(): void {
    if (this.currentBeatIndex > 0) {
      this.currentBeatIndex--;
      const beat = this.plan.beats[this.currentBeatIndex];
      this.diagram.seek(beat.start);
    }
  }

  public getCurrentBeatIndex(): number {
    return this.currentBeatIndex;
  }

  public togglePlay(): void {
    this.diagram.play();
  }

  public setSpeed(rate: number): void {
    this.diagram.setPlaybackRate(rate);
  }

  private attachKeyboardListener(): void {
    window.addEventListener("keydown", (e) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.key) {
        case "ArrowRight":
        case "PageDown":
          this.nextBeat();
          break;
        case "ArrowLeft":
        case "PageUp":
          this.prevBeat();
          break;
        case " ":
          e.preventDefault();
          this.togglePlay();
          break;
        case "1":
          this.setSpeed(1);
          break;
        case "2":
          this.setSpeed(2);
          break;
      }
    });
  }
}

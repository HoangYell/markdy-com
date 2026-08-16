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
  private options: ControllerOptions;
  private isDestroyed = false;

  constructor(diagram: Diagram, plan: RenderPlan, options: ControllerOptions = {}) {
    this.diagram = diagram;
    this.plan = plan;
    this.options = options;

    if (options.enableKeyboard !== false && typeof window !== "undefined") {
      window.addEventListener("keydown", this.onKeyDown);
    }
  }

  public nextBeat(): void {
    if (this.currentBeatIndex < this.plan.beats.length - 1) {
      this.currentBeatIndex++;
      this.applyCurrentBeat();
    }
  }

  public prevBeat(): void {
    if (this.currentBeatIndex > 0) {
      this.currentBeatIndex--;
      this.applyCurrentBeat();
    }
  }
  
  private applyCurrentBeat(): void {
    const beat = this.plan.beats[this.currentBeatIndex];
    this.diagram.seek(beat.start);
    if (this.options.onBeatChange) {
      this.options.onBeatChange(beat.name, this.currentBeatIndex);
    }
  }

  public getCurrentBeatIndex(): number {
    return this.currentBeatIndex;
  }

  public togglePlay(): void {
    if (this.diagram.isPlaying()) {
      this.diagram.pause();
    } else {
      this.diagram.play();
    }
  }

  public setSpeed(rate: number): void {
    this.diagram.setPlaybackRate(rate);
  }

  private onKeyDown = (e: KeyboardEvent): void => {
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
  };
  
  public destroy(): void {
    if (this.isDestroyed) return;
    this.isDestroyed = true;
    if (typeof window !== "undefined") {
      window.removeEventListener("keydown", this.onKeyDown);
    }
  }
}

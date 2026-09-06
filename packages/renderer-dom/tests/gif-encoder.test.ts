import { describe, expect, it } from "vitest";
import { encodeGifSequence } from "../src/export/gif-encoder.js";

function frame(red: number, delayMs: number) {
  return {
    imageData: { width: 1, height: 1, data: new Uint8ClampedArray([red, 0, 0, 255]) } as ImageData,
    delayMs,
  };
}

function readDelays(bytes: Uint8Array): number[] {
  const delays: number[] = [];
  let offset = 13 + ((bytes[10] & 0x80) ? 3 * 2 ** ((bytes[10] & 7) + 1) : 0);
  const skipBlocks = () => {
    while (bytes[offset] > 0) offset += bytes[offset] + 1;
    offset++;
  };
  while (offset < bytes.length && bytes[offset] !== 0x3b) {
    if (bytes[offset] === 0x21) {
      if (bytes[offset + 1] === 0xf9) {
        delays.push(bytes[offset + 4] | (bytes[offset + 5] << 8));
      }
      offset += 2;
      skipBlocks();
    } else if (bytes[offset] === 0x2c) {
      const packed = bytes[offset + 9];
      offset += 10 + ((packed & 0x80) ? 3 * 2 ** ((packed & 7) + 1) : 0);
      offset++;
      skipBlocks();
    } else {
      throw new Error(`Unexpected GIF block at ${offset}`);
    }
  }
  return delays;
}

describe("GIF frame timing", () => {
  it("retains the final hold when consecutive frames are identical", () => {
    const bytes = encodeGifSequence([frame(255, 100), frame(255, 1400)]);
    expect(readDelays(bytes)).toEqual([150]);
  });

  it("merges a hold into the preceding diff frame", () => {
    const bytes = encodeGifSequence([frame(0, 100), frame(255, 100), frame(255, 1400)]);
    expect(readDelays(bytes)).toEqual([10, 150]);
  });

  it("preserves individual delays with diff compression disabled", () => {
    const bytes = encodeGifSequence([frame(255, 100), frame(255, 1400)], { diff: false });
    expect(readDelays(bytes)).toEqual([10, 140]);
  });

  it("keeps a duplicate frame when merging would overflow the GIF delay field", () => {
    const bytes = encodeGifSequence([frame(255, 400000), frame(255, 400000)]);
    expect(readDelays(bytes)).toEqual([40000, 40000]);
  });
});
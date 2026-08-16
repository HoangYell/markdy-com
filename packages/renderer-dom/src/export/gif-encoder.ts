/**
 * packages/renderer-dom/src/export/gif-encoder.ts
 * Pure TypeScript GIF89a Encoder with LZW Compression & Floyd-Steinberg Dithering.
 * Zero external dependencies.
 */

const GIF_HEADER = "GIF89a";

const PALETTE_RGB332: Uint8Array = (() => {
  const palette = new Uint8Array(256 * 3);
  for (let i = 0; i < 256; i++) {
    const r = Math.round((((i >> 5) & 0x07) * 255) / 7);
    const g = Math.round((((i >> 2) & 0x07) * 255) / 7);
    const b = Math.round(((i & 0x03) * 255) / 3);
    palette[i * 3] = r;
    palette[i * 3 + 1] = g;
    palette[i * 3 + 2] = b;
  }
  return palette;
})();

function clamp(value: number, min = 0, max = 255): number {
  return value < min ? min : value > max ? max : value;
}

function nearestColorIndex(r: number, g: number, b: number): number {
  return ((clamp(r) & 0xe0) | ((clamp(g) & 0xe0) >> 3) | ((clamp(b) & 0xc0) >> 6)) & 0xff;
}

function quantizeFrame(imageData: ImageData, dither: boolean): Uint8Array {
  const { width, height, data } = imageData;
  const pixelCount = width * height;
  const out = new Uint8Array(pixelCount);

  if (!dither) {
    for (let i = 0; i < pixelCount; i++) {
      const idx = i * 4;
      out[i] = ((data[idx] & 0xe0) | ((data[idx + 1] & 0xe0) >> 3) | ((data[idx + 2] & 0xc0) >> 6)) & 0xff;
    }
    return out;
  }

  const errR = new Float32Array(pixelCount);
  const errG = new Float32Array(pixelCount);
  const errB = new Float32Array(pixelCount);

  for (let i = 0; i < pixelCount; i++) {
    const idx = i * 4;
    errR[i] = data[idx];
    errG[i] = data[idx + 1];
    errB[i] = data[idx + 2];
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const r = clamp(Math.round(errR[idx]));
      const g = clamp(Math.round(errG[idx]));
      const b = clamp(Math.round(errB[idx]));

      const colorIdx = nearestColorIndex(r, g, b);
      out[idx] = colorIdx;

      const pr = PALETTE_RGB332[colorIdx * 3];
      const pg = PALETTE_RGB332[colorIdx * 3 + 1];
      const pb = PALETTE_RGB332[colorIdx * 3 + 2];

      const dr = errR[idx] - pr;
      const dg = errG[idx] - pg;
      const db = errB[idx] - pb;

      if (x + 1 < width) {
        errR[idx + 1] += (dr * 7) / 16;
        errG[idx + 1] += (dg * 7) / 16;
        errB[idx + 1] += (db * 7) / 16;
      }
      if (y + 1 < height) {
        if (x > 0) {
          errR[idx + width - 1] += (dr * 3) / 16;
          errG[idx + width - 1] += (dg * 3) / 16;
          errB[idx + width - 1] += (db * 3) / 16;
        }
        errR[idx + width] += (dr * 5) / 16;
        errG[idx + width] += (dg * 5) / 16;
        errB[idx + width] += (db * 5) / 16;
        if (x + 1 < width) {
          errR[idx + width + 1] += (dr * 1) / 16;
          errG[idx + width + 1] += (dg * 1) / 16;
          errB[idx + width + 1] += (db * 1) / 16;
        }
      }
    }
  }

  return out;
}

function lzwCompress(pixels: Uint8Array, minCodeSize = 8): Uint8Array {
  const clearCode = 1 << minCodeSize;
  const endCode = clearCode + 1;
  let codeSize = minCodeSize + 1;
  let nextCode = endCode + 1;
  let dict = new Map<string, number>();

  for (let i = 0; i < clearCode; i++) {
    dict.set(String(i), i);
  }

  const codes: number[] = [clearCode];
  let prefix = String(pixels[0] ?? 0);

  for (let i = 1; i < pixels.length; i++) {
    const suffix = String(pixels[i]);
    const combo = `${prefix},${suffix}`;
    if (dict.has(combo)) {
      prefix = combo;
      continue;
    }

    codes.push(dict.get(prefix)!);
    dict.set(combo, nextCode++);
    prefix = suffix;

    if (nextCode === 1 << codeSize && codeSize < 12) {
      codeSize++;
    }

    if (nextCode >= 4096) {
      codes.push(clearCode);
      dict = new Map();
      for (let j = 0; j < clearCode; j++) dict.set(String(j), j);
      codeSize = minCodeSize + 1;
      nextCode = endCode + 1;
    }
  }

  codes.push(dict.get(prefix)!);
  codes.push(endCode);

  const bytes: number[] = [];
  let bitBuffer = 0;
  let bitCount = 0;
  codeSize = minCodeSize + 1;
  nextCode = endCode + 1;

  for (const code of codes) {
    bitBuffer |= code << bitCount;
    bitCount += codeSize;

    while (bitCount >= 8) {
      bytes.push(bitBuffer & 0xff);
      bitBuffer >>= 8;
      bitCount -= 8;
    }

    if (code === clearCode) {
      codeSize = minCodeSize + 1;
      nextCode = endCode + 1;
    } else if (code !== endCode) {
      nextCode++;
      if (nextCode === 1 << codeSize && codeSize < 12) {
        codeSize++;
      }
    }
  }

  if (bitCount > 0) {
    bytes.push(bitBuffer & 0xff);
  }

  return new Uint8Array(bytes);
}

export interface AnimationRecordFrame {
  imageData: ImageData;
  delayMs: number;
}

export interface GifExportOptions {
  dither?: boolean;
  loop?: boolean;
}

export function encodeGifSequence(
  frames: AnimationRecordFrame[],
  options: GifExportOptions = {}
): Uint8Array {
  if (frames.length === 0) {
    throw new Error("Cannot encode GIF without frames");
  }

  const { width, height } = frames[0].imageData;
  const dither = options.dither ?? true;
  const buffer: number[] = [];

  const pushString = (str: string) => {
    for (let i = 0; i < str.length; i++) buffer.push(str.charCodeAt(i));
  };
  const pushU16 = (val: number) => {
    buffer.push(val & 0xff, (val >> 8) & 0xff);
  };

  // Header & Logical Screen Descriptor
  pushString(GIF_HEADER);
  pushU16(width);
  pushU16(height);
  buffer.push(0xf7); // Global color table flag (256 colors)
  buffer.push(0x00); // Background color index
  buffer.push(0x00); // Pixel aspect ratio

  // Global Color Table
  for (let i = 0; i < PALETTE_RGB332.length; i++) {
    buffer.push(PALETTE_RGB332[i]);
  }

  // Netscape Application Extension (for looping)
  if (options.loop !== false) {
    buffer.push(0x21, 0xff, 0x0b);
    pushString("NETSCAPE2.0");
    buffer.push(0x03, 0x01, 0x00, 0x00, 0x00);
  }

  for (const frame of frames) {
    const quantized = quantizeFrame(frame.imageData, dither);
    const compressed = lzwCompress(quantized);

    // Graphic Control Extension
    const delayHundredths = Math.max(2, Math.round(frame.delayMs / 10));
    buffer.push(0x21, 0xf9, 0x04, 0x04);
    pushU16(delayHundredths);
    buffer.push(0x00, 0x00);

    // Image Descriptor
    buffer.push(0x2c);
    pushU16(0); // Left
    pushU16(0); // Top
    pushU16(width);
    pushU16(height);
    buffer.push(0x00); // Local color table flag

    // Image Data
    buffer.push(0x08); // LZW minimum code size
    for (let offset = 0; offset < compressed.length; offset += 255) {
      const chunk = compressed.slice(offset, offset + 255);
      buffer.push(chunk.length, ...chunk);
    }
    buffer.push(0x00); // Block terminator
  }

  // GIF Trailer
  buffer.push(0x3b);

  return new Uint8Array(buffer);
}

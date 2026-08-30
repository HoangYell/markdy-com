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

const BITS = 12;
const HSIZE = 5003;
const MASKS = [
  0x0000, 0x0001, 0x0003, 0x0007, 0x000f, 0x001f, 0x003f, 0x007f,
  0x00ff, 0x01ff, 0x03ff, 0x07ff, 0x0fff, 0x1fff, 0x3fff, 0x7fff, 0xffff,
];

function lzwCompress(pixels: Uint8Array, minCodeSize = 8): Uint8Array {
  const out: number[] = [];
  const accum = new Uint8Array(256);
  const htab = new Int32Array(HSIZE);
  const codetab = new Int32Array(HSIZE);

  htab.fill(-1);
  codetab.fill(0);

  const init_bits = minCodeSize + 1;
  const g_init_bits = init_bits;

  let clear_flg = false;
  let n_bits = g_init_bits;
  let maxcode = (1 << n_bits) - 1;

  const ClearCode = 1 << minCodeSize;
  const EOFCode = ClearCode + 1;
  let free_ent = ClearCode + 2;
  let a_count = 0;

  let cur_accum = 0;
  let cur_bits = 0;

  let ent = pixels[0] ?? 0;

  let hshift = 0;
  for (let fcode = HSIZE; fcode < 65536; fcode *= 2) {
    ++hshift;
  }
  hshift = 8 - hshift;

  // LZW Minimum Code Size
  out.push(minCodeSize);

  output(ClearCode);

  for (let idx = 1; idx < pixels.length; idx++) {
    next_block: {
      const c = pixels[idx];
      const fcode = (c << BITS) + ent;
      let i = (c << hshift) ^ ent;

      if (htab[i] === fcode) {
        ent = codetab[i];
        break next_block;
      }

      const disp = i === 0 ? 1 : HSIZE - i;
      while (htab[i] >= 0) {
        i -= disp;
        if (i < 0) i += HSIZE;
        if (htab[i] === fcode) {
          ent = codetab[i];
          break next_block;
        }
      }

      output(ent);
      ent = c;
      if (free_ent < (1 << BITS)) {
        codetab[i] = free_ent++;
        htab[i] = fcode;
      } else {
        htab.fill(-1);
        free_ent = ClearCode + 2;
        clear_flg = true;
        output(ClearCode);
      }
    }
  }

  output(ent);
  output(EOFCode);

  out.push(0); // Sub-block terminator
  return new Uint8Array(out);

  function output(code: number) {
    cur_accum &= MASKS[cur_bits];

    if (cur_bits > 0) cur_accum |= code << cur_bits;
    else cur_accum = code;

    cur_bits += n_bits;

    while (cur_bits >= 8) {
      accum[a_count++] = cur_accum & 0xff;
      if (a_count >= 254) {
        out.push(a_count);
        for (let j = 0; j < a_count; j++) out.push(accum[j]);
        a_count = 0;
      }
      cur_accum >>= 8;
      cur_bits -= 8;
    }

    if (free_ent > maxcode || clear_flg) {
      if (clear_flg) {
        n_bits = g_init_bits;
        maxcode = (1 << n_bits) - 1;
        clear_flg = false;
      } else {
        ++n_bits;
        maxcode = n_bits === BITS ? (1 << n_bits) : (1 << n_bits) - 1;
      }
    }

    if (code === EOFCode) {
      while (cur_bits > 0) {
        accum[a_count++] = cur_accum & 0xff;
        if (a_count >= 254) {
          out.push(a_count);
          for (let j = 0; j < a_count; j++) out.push(accum[j]);
          a_count = 0;
        }
        cur_accum >>= 8;
        cur_bits -= 8;
      }
      if (a_count > 0) {
        out.push(a_count);
        for (let j = 0; j < a_count; j++) out.push(accum[j]);
        a_count = 0;
      }
    }
  }
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
  const dither = options.dither ?? false;
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
    const compressedWithHeader = lzwCompress(quantized);

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

    // Image Data (includes minCodeSize, sub-blocks, and 0x00 terminator)
    for (let i = 0; i < compressedWithHeader.length; i++) {
      buffer.push(compressedWithHeader[i]);
    }
  }

  // GIF Trailer
  buffer.push(0x3b);

  return new Uint8Array(buffer);
}

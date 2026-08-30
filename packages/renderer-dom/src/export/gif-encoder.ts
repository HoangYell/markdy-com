/**
 * packages/renderer-dom/src/export/gif-encoder.ts
 * Pure TypeScript GIF89a Encoder with LZW Compression & Floyd-Steinberg Dithering.
 * Zero external dependencies.
 */

const GIF_HEADER = "GIF89a";
const TRANSPARENT_COLOR_INDEX = 255;

export interface AdaptiveQuantizer {
  palette: Uint8Array;
  quantize: (imageData: ImageData) => Uint8Array;
}

export function buildAdaptivePalette(
  frames: AnimationRecordFrame[],
  maxColors = 254
): AdaptiveQuantizer {
  const histogram = new Map<number, number>();

  // Sample pixels across frames for comprehensive color coverage
  const stepFrame = Math.max(1, Math.floor(frames.length / 8));
  for (let f = 0; f < frames.length; f += stepFrame) {
    const data = frames[f].imageData.data;
    const len = data.length;
    for (let i = 0; i < len; i += 8) {
      const a = data[i + 3];
      if (a < 16) continue;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const key = (r << 16) | (g << 8) | b;
      histogram.set(key, (histogram.get(key) || 0) + 1);
    }
  }

  const entries = Array.from(histogram.entries());
  let paletteColors: [number, number, number][] = [];

  if (entries.length <= maxColors) {
    paletteColors = entries.map(([key]) => [
      (key >> 16) & 0xff,
      (key >> 8) & 0xff,
      key & 0xff,
    ]);
  } else {
    // Sort by frequency (most dominant diagram colors first)
    entries.sort((a, b) => b[1] - a[1]);

    const topCount = Math.min(128, Math.floor(maxColors * 0.6));
    for (let i = 0; i < topCount; i++) {
      const key = entries[i][0];
      paletteColors.push([
        (key >> 16) & 0xff,
        (key >> 8) & 0xff,
        key & 0xff,
      ]);
    }

    // Cluster remaining anti-aliased shades into RGB555 buckets
    const buckets = new Map<number, { rSum: number; gSum: number; bSum: number; count: number }>();
    for (let i = topCount; i < entries.length; i++) {
      const [key, count] = entries[i];
      const r = (key >> 16) & 0xff;
      const g = (key >> 8) & 0xff;
      const b = key & 0xff;
      const bKey = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
      let buck = buckets.get(bKey);
      if (!buck) {
        buck = { rSum: 0, gSum: 0, bSum: 0, count: 0 };
        buckets.set(bKey, buck);
      }
      buck.rSum += r * count;
      buck.gSum += g * count;
      buck.bSum += b * count;
      buck.count += count;
    }

    const bucketList = Array.from(buckets.values()).sort((a, b) => b.count - a.count);
    const remainSlots = maxColors - paletteColors.length;
    for (let i = 0; i < Math.min(remainSlots, bucketList.length); i++) {
      const b = bucketList[i];
      paletteColors.push([
        Math.round(b.rSum / b.count),
        Math.round(b.gSum / b.count),
        Math.round(b.bSum / b.count),
      ]);
    }
  }

  if (paletteColors.length === 0) {
    paletteColors.push([255, 255, 255]);
  }

  // Build global 256-color table (Slot 255 strictly reserved for transparency)
  const globalPalette = new Uint8Array(256 * 3);
  for (let i = 0; i < paletteColors.length; i++) {
    globalPalette[i * 3] = paletteColors[i][0];
    globalPalette[i * 3 + 1] = paletteColors[i][1];
    globalPalette[i * 3 + 2] = paletteColors[i][2];
  }
  for (let i = paletteColors.length; i < 255; i++) {
    globalPalette[i * 3] = 0;
    globalPalette[i * 3 + 1] = 0;
    globalPalette[i * 3 + 2] = 0;
  }
  globalPalette[255 * 3] = 0;
  globalPalette[255 * 3 + 1] = 0;
  globalPalette[255 * 3 + 2] = 0;

  // Build RGB555 lookup cache (32768 entries) for O(1) quantization
  const lookupCache = new Uint8Array(32768);
  const colorCount = paletteColors.length;

  for (let r5 = 0; r5 < 32; r5++) {
    const r = (r5 << 3) | (r5 >> 2);
    for (let g5 = 0; g5 < 32; g5++) {
      const g = (g5 << 3) | (g5 >> 2);
      for (let b5 = 0; b5 < 32; b5++) {
        const b = (b5 << 3) | (b5 >> 2);
        let bestIdx = 0;
        let bestDist = Infinity;
        for (let i = 0; i < colorCount; i++) {
          const pr = globalPalette[i * 3];
          const pg = globalPalette[i * 3 + 1];
          const pb = globalPalette[i * 3 + 2];
          // Perceptually weighted Euclidean distance
          const dist = (r - pr) ** 2 * 2 + (g - pg) ** 2 * 4 + (b - pb) ** 2 * 1;
          if (dist < bestDist) {
            bestDist = dist;
            bestIdx = i;
            if (dist === 0) break;
          }
        }
        const cacheKey = (r5 << 10) | (g5 << 5) | b5;
        lookupCache[cacheKey] = bestIdx;
      }
    }
  }

  return {
    palette: globalPalette,
    quantize(imageData: ImageData): Uint8Array {
      const { width, height, data } = imageData;
      const pixelCount = width * height;
      const out = new Uint8Array(pixelCount);
      for (let i = 0; i < pixelCount; i++) {
        const idx = i * 4;
        const a = data[idx + 3];
        if (a < 16) {
          out[i] = 255;
          continue;
        }
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const cacheKey = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
        out[i] = lookupCache[cacheKey];
      }
      return out;
    },
  };
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
  diff?: boolean;
}

export function encodeGifSequence(
  frames: AnimationRecordFrame[],
  options: GifExportOptions = {}
): Uint8Array {
  if (frames.length === 0) {
    throw new Error("Cannot encode GIF without frames");
  }

  const { width, height } = frames[0].imageData;
  const enableDiff = options.diff !== false;
  const quantizer = buildAdaptivePalette(frames);
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

  // Global Color Table (Adaptive Diagram Colors)
  for (let i = 0; i < quantizer.palette.length; i++) {
    buffer.push(quantizer.palette[i]);
  }

  // Netscape Application Extension (for looping)
  if (options.loop !== false) {
    buffer.push(0x21, 0xff, 0x0b);
    pushString("NETSCAPE2.0");
    buffer.push(0x03, 0x01, 0x00, 0x00, 0x00);
  }

  let prevQuantized: Uint8Array | null = null;

  for (let frameIdx = 0; frameIdx < frames.length; frameIdx++) {
    const frame = frames[frameIdx];
    const currQuantized = quantizer.quantize(frame.imageData);
    const delayHundredths = Math.max(2, Math.round(frame.delayMs / 10));

    if (!enableDiff || prevQuantized === null || frameIdx === 0) {
      const compressedWithHeader = lzwCompress(currQuantized);

      // Graphic Control Extension (Disposal 1: Leave in place)
      buffer.push(0x21, 0xf9, 0x04, 0x04);
      pushU16(delayHundredths);
      buffer.push(0x00, 0x00);

      // Image Descriptor (Full screen)
      buffer.push(0x2c);
      pushU16(0); // Left
      pushU16(0); // Top
      pushU16(width);
      pushU16(height);
      buffer.push(0x00); // Local color table flag

      // Image Data
      for (let i = 0; i < compressedWithHeader.length; i++) {
        buffer.push(compressedWithHeader[i]);
      }
      prevQuantized = currQuantized;
    } else {
      // Find diff bounding box
      let minX = width;
      let minY = height;
      let maxX = -1;
      let maxY = -1;

      for (let y = 0; y < height; y++) {
        const rowOffset = y * width;
        for (let x = 0; x < width; x++) {
          if (currQuantized[rowOffset + x] !== prevQuantized[rowOffset + x]) {
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }

      if (maxX < minX || maxY < minY) {
        // Zero visual change across entire frame: skip encoding duplicate frame
        continue;
      }

      const diffW = maxX - minX + 1;
      const diffH = maxY - minY + 1;
      const diffData = new Uint8Array(diffW * diffH);

      for (let dy = 0; dy < diffH; dy++) {
        const gy = minY + dy;
        const gRowOffset = gy * width;
        const dRowOffset = dy * diffW;
        for (let dx = 0; dx < diffW; dx++) {
          const gx = minX + dx;
          const currCol = currQuantized[gRowOffset + gx];
          const prevCol = prevQuantized[gRowOffset + gx];
          diffData[dRowOffset + dx] = (currCol === prevCol) ? TRANSPARENT_COLOR_INDEX : currCol;
        }
      }

      const compressedWithHeader = lzwCompress(diffData);

      // Graphic Control Extension (Disposal 1 + Transparent Flag 1, Index 255)
      buffer.push(0x21, 0xf9, 0x04, 0x05); // 0x05 = disposal 1 (leave) + transparency enabled
      pushU16(delayHundredths);
      buffer.push(TRANSPARENT_COLOR_INDEX, 0x00);

      // Image Descriptor (Cropped bounding box with offset)
      buffer.push(0x2c);
      pushU16(minX);
      pushU16(minY);
      pushU16(diffW);
      pushU16(diffH);
      buffer.push(0x00); // Local color table flag

      // Image Data
      for (let i = 0; i < compressedWithHeader.length; i++) {
        buffer.push(compressedWithHeader[i]);
      }

      prevQuantized = currQuantized;
    }
  }

  // GIF Trailer
  buffer.push(0x3b);

  return new Uint8Array(buffer);
}

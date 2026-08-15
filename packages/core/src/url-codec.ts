/**
 * packages/core/src/url-codec.ts
 * Web Standard CompressionStream / DecompressionStream state codec for Markdy.
 * Zero external dependencies. Works across modern browsers, Node, Bun, Deno.
 */

const PREFIX = "~m";
const B64_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

function bytesToBase64Url(bytes: Uint8Array): string {
  let result = "";
  const len = bytes.length;
  let i = 0;

  while (i < len) {
    const b0 = bytes[i++];
    const b1 = i < len ? bytes[i++] : NaN;
    const b2 = i < len ? bytes[i++] : NaN;

    const idx0 = b0 >> 2;
    const idx1 = ((b0 & 3) << 4) | (isNaN(b1) ? 0 : b1 >> 4);
    result += B64_CHARS[idx0] + B64_CHARS[idx1];

    if (!isNaN(b1)) {
      const idx2 = ((b1 & 15) << 2) | (isNaN(b2) ? 0 : b2 >> 6);
      result += B64_CHARS[idx2];
    }
    if (!isNaN(b2)) {
      const idx3 = b2 & 63;
      result += B64_CHARS[idx3];
    }
  }

  return result;
}

const B64_LOOKUP = new Uint8Array(256);
for (let i = 0; i < B64_CHARS.length; i++) {
  B64_LOOKUP[B64_CHARS.charCodeAt(i)] = i;
}
// Also support standard base64 characters + and /
B64_LOOKUP["+".charCodeAt(0)] = 62;
B64_LOOKUP["/".charCodeAt(0)] = 63;

function base64UrlToBytes(str: string): Uint8Array {
  const cleanStr = str.replace(/=/g, "");
  const len = cleanStr.length;
  const outLen = (len * 3) >> 2;
  const bytes = new Uint8Array(outLen);

  let inIdx = 0;
  let outIdx = 0;

  while (inIdx < len) {
    const c0 = B64_LOOKUP[cleanStr.charCodeAt(inIdx++)];
    const c1 = B64_LOOKUP[cleanStr.charCodeAt(inIdx++)];
    const c2 = inIdx < len ? B64_LOOKUP[cleanStr.charCodeAt(inIdx++)] : 64;
    const c3 = inIdx < len ? B64_LOOKUP[cleanStr.charCodeAt(inIdx++)] : 64;

    bytes[outIdx++] = (c0 << 2) | (c1 >> 4);
    if (c2 !== 64 && outIdx < outLen) {
      bytes[outIdx++] = ((c1 & 15) << 4) | (c2 >> 2);
    }
    if (c3 !== 64 && outIdx < outLen) {
      bytes[outIdx++] = ((c2 & 3) << 6) | c3;
    }
  }

  return bytes;
}

export async function compressMarkdyToUrlHash(code: string): Promise<string> {
  const encoder = new TextEncoder();
  const inputBytes = encoder.encode(code);

  if (typeof CompressionStream !== "undefined") {
    const cs = new CompressionStream("deflate-raw");
    const writer = cs.writable.getWriter();
    writer.write(inputBytes as any);
    writer.close();

    const response = new Response(cs.readable);
    const compressedBuffer = await response.arrayBuffer();
    return PREFIX + bytesToBase64Url(new Uint8Array(compressedBuffer));
  }

  return PREFIX + bytesToBase64Url(inputBytes);
}

export async function decompressMarkdyFromUrlHash(hash: string): Promise<string> {
  if (!hash.startsWith(PREFIX)) {
    throw new Error("Invalid Markdy compressed URL state prefix");
  }

  const rawPayload = hash.slice(PREFIX.length);
  const bytes = base64UrlToBytes(rawPayload);

  if (typeof DecompressionStream !== "undefined") {
    try {
      const ds = new DecompressionStream("deflate-raw");
      const writer = ds.writable.getWriter();
      writer.write(bytes as any);
      writer.close();

      const response = new Response(ds.readable);
      const decompressedBuffer = await response.arrayBuffer();
      return new TextDecoder().decode(decompressedBuffer);
    } catch {
      return new TextDecoder().decode(bytes);
    }
  }

  return new TextDecoder().decode(bytes);
}

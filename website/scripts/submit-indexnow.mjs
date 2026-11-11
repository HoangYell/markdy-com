#!/usr/bin/env node
/**
 * IndexNow Protocol Submitter for markdy.com
 * Broadcasts diagram specs, documentation, and showcase URLs to IndexNow network.
 */

import fs from "node:fs";
import path from "node:path";

const HOST = "markdy.com";
const INDEXNOW_KEY = "63c35bdbfc23992c84bcbeaae8c5febd";
const KEY_LOCATION = `https://${HOST}/${INDEXNOW_KEY}.txt`;
const ENDPOINTS = [
  "https://api.indexnow.org/indexnow",
  "https://yandex.com/indexnow",
];

const REPO_ROOT = path.resolve(import.meta.dirname, "..");
const DIST_SITEMAP = path.join(REPO_ROOT, "dist", "sitemap-0.xml");

async function extractUrls() {
  if (fs.existsSync(DIST_SITEMAP)) {
    const xml = fs.readFileSync(DIST_SITEMAP, "utf8");
    const matches = [...xml.matchAll(/<loc>(https:\/\/[^<]+)<\/loc>/g)];
    return matches.map((m) => m[1]);
  }

  // Fallback: fetch live sitemap-0.xml
  try {
    const res = await fetch(`https://${HOST}/sitemap-0.xml`, {
      signal: AbortSignal.timeout(10000),
    });
    if (res.ok) {
      const xml = await res.text();
      const matches = [...xml.matchAll(/<loc>(https:\/\/[^<]+)<\/loc>/g)];
      return matches.map((m) => m[1]);
    }
  } catch (err) {
    console.warn(`[indexnow] sitemap fetch error: ${err.message}`);
  }

  return [`https://${HOST}/`];
}

async function submitBatch(urls) {
  if (urls.length === 0) {
    console.log("ℹ️ No URLs to submit to IndexNow.");
    return true;
  }

  console.log(`🚀 Submitting ${urls.length} URL(s) to IndexNow network for ${HOST}...`);

  const payload = {
    host: HOST,
    key: INDEXNOW_KEY,
    keyLocation: KEY_LOCATION,
    urlList: urls,
  };

  let anySuccess = false;
  for (const endpoint of ENDPOINTS) {
    const hostLabel = new URL(endpoint).hostname;
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
        },
        body: JSON.stringify(payload),
      });

      if (res.status === 200 || res.status === 202) {
        console.log(
          `✅ [${hostLabel}] HTTP ${res.status}: ${res.status === 200 ? "OK" : "Accepted"}. Submitted ${urls.length} URL(s).`,
        );
        anySuccess = true;
      } else {
        const text = await res.text().catch(() => "");
        console.warn(
          `⚠️ [${hostLabel}] HTTP ${res.status}: ${text || res.statusText}`,
        );
      }
    } catch (err) {
      console.warn(`⚠️ [${hostLabel}] network error: ${err.message}`);
    }
  }

  return anySuccess;
}

async function main() {
  const args = process.argv.slice(2);
  let urls = [];

  if (args.length > 0 && !args[0].startsWith("-")) {
    urls = args.filter((arg) => arg.startsWith("http"));
  } else {
    urls = await extractUrls();
  }

  console.log(`📋 IndexNow Target: ${urls.length} URL(s) prepared.`);

  const CHUNK_SIZE = 500;
  for (let i = 0; i < urls.length; i += CHUNK_SIZE) {
    const chunk = urls.slice(i, i + CHUNK_SIZE);
    await submitBatch(chunk);
  }
}

main().catch((err) => {
  console.error("IndexNow script error:", err);
  process.exit(0);
});

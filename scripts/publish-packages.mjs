#!/usr/bin/env node
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = resolve(__filename, '..');
const ROOT = resolve(__dirname, '..');
const PACKAGES_DIR = resolve(ROOT, 'packages');

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const registryArg = args.find((a) => a.startsWith('--registry='));
const targetRegistry = registryArg ? registryArg.replace('--registry=', '') : 'https://registry.npmjs.org';

const scopeArg = args.find((a) => a.startsWith('--scope='));
const targetScope = scopeArg ? scopeArg.replace('--scope=', '').replace(/^@/, '').toLowerCase() : null;

async function isVersionPublished(name, version, registry) {
  try {
    const result = spawnSync('npm', ['view', `${name}@${version}`, 'version', `--registry=${registry}`], {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return result.status === 0 && result.stdout.trim() === version;
  } catch {
    return false;
  }
}

async function main() {
  console.log(`\n🚀 Markdy Package Publisher`);
  console.log(`📦 Registry: ${targetRegistry}`);
  if (targetScope) {
    console.log(`🏷️  Target Scope: @${targetScope}`);
  }
  console.log(`🔍 Dry run: ${isDryRun ? 'YES' : 'NO'}\n`);

  const entries = await readdir(PACKAGES_DIR, { withFileTypes: true });
  const packageDirs = entries.filter((e) => e.isDirectory()).map((e) => e.name);

  const results = [];

  for (const dir of packageDirs) {
    const pkgPath = join(PACKAGES_DIR, dir);
    const pkgJsonPath = join(pkgPath, 'package.json');

    let originalContent;
    let pkgJson;
    try {
      originalContent = await readFile(pkgJsonPath, 'utf8');
      pkgJson = JSON.parse(originalContent);
    } catch {
      continue;
    }

    if (pkgJson.private) {
      console.log(`⏭️  Skipping private package: ${pkgJson.name || dir}`);
      continue;
    }

    let publishName = pkgJson.name;
    const version = pkgJson.version;

    if (targetScope && publishName.startsWith('@')) {
      const pkgSubName = publishName.split('/')[1];
      publishName = `@${targetScope}/${pkgSubName}`;
    }

    console.log(`\n👉 Checking ${publishName}@${version}...`);

    try {
      if (publishName !== pkgJson.name) {
        pkgJson.name = publishName;
        await writeFile(pkgJsonPath, JSON.stringify(pkgJson, null, 2) + '\n', 'utf8');
      }

      const alreadyPublished = await isVersionPublished(publishName, version, targetRegistry);
      if (alreadyPublished) {
        console.log(`   ℹ️  ${publishName}@${version} is already published on ${targetRegistry}. Skipping.`);
        results.push({ name: publishName, version, status: 'already-published' });
        continue;
      }

      const publishCmd = ['publish', '--no-git-checks', '--access', 'public', `--registry=${targetRegistry}`];
      if (isDryRun) {
        publishCmd.push('--dry-run');
      }

      console.log(`   ⚡ Executing: pnpm ${publishCmd.join(' ')} (in packages/${dir})`);

      const res = spawnSync('pnpm', publishCmd, {
        cwd: pkgPath,
        stdio: 'inherit',
        env: process.env,
      });

      if (res.status !== 0) {
        console.error(`   ❌ Failed to publish ${publishName}@${version}`);
        if (!isDryRun) {
          process.exit(res.status || 1);
        }
        results.push({ name: publishName, version, status: 'failed' });
      } else {
        console.log(`   ✅ Successfully published ${publishName}@${version}`);
        results.push({ name: publishName, version, status: isDryRun ? 'simulated' : 'published' });
      }
    } finally {
      if (publishName !== pkgJson.name || originalContent) {
        await writeFile(pkgJsonPath, originalContent, 'utf8');
      }
    }
  }

  console.log('\n📊 Summary:');
  console.table(results);
}

main().catch((err) => {
  console.error('Fatal publishing error:', err);
  process.exit(1);
});

#!/usr/bin/env node
/*
 * Assembles the Next.js standalone server into a Tauri sidecar bundle.
 * Invoked by `tauri build` via tauri.conf.json -> build.beforeBuildCommand.
 *
 * Produces:
 *   src-tauri/sidecar-dist/          server.js launcher + standalone server + natives
 *   src-tauri/binaries/node-<triple> a PORTABLE Node runtime (downloaded from nodejs.org)
 *
 * Notes:
 *  - This repo's `next` is hoisted to the parent monorepo node_modules, so Next's
 *    standalone output nests the server under a subdir (e.g. agent-orchestrator-hq/).
 *    We detect that and write a top-level server.js launcher so the Rust side always
 *    runs `sidecar-dist/server.js`.
 *  - The local (homebrew) node is a tiny dynamically-linked launcher, not portable,
 *    so we fetch the self-contained official binary for this platform instead.
 *  - Cross-platform installers must run this on each target (CI matrix) so the
 *    native `.node` modules and the Node binary match the OS/arch.
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tauriDir = path.join(root, 'src-tauri');
const distDir = path.join(tauriDir, 'sidecar-dist');
const binDir = path.join(tauriDir, 'binaries');

const rmrf = (p) => fs.rmSync(p, { recursive: true, force: true });
const cp = (s, d) => fs.cpSync(s, d, { recursive: true });
const exists = (p) => fs.existsSync(p);
const triple = () => execSync('rustc -vV').toString().match(/host:\s*(\S+)/)[1];

// 0. Clear any previous bundle FIRST — it lives in the project tree, so a stale copy
//    would be picked up by the next `next build` (type-check / tracing).
rmrf(distDir);

// 1. Build Next in standalone mode (TAURI_BUILD flips next.config to output:'standalone').
console.log('[sidecar] next build (standalone)…');
execSync('npm run build', { cwd: root, stdio: 'inherit', env: { ...process.env, TAURI_BUILD: 'true' } });

// 2. Copy the standalone server tree.
fs.mkdirSync(distDir, { recursive: true });
cp(path.join(root, '.next/standalone'), distDir);

// 3. Locate server.js (it may be nested under a monorepo subpath).
function findAppSubdir(base) {
  if (exists(path.join(base, 'server.js'))) return '.';
  for (const e of fs.readdirSync(base, { withFileTypes: true })) {
    if (e.isDirectory() && exists(path.join(base, e.name, 'server.js'))) return e.name;
  }
  throw new Error('Could not locate server.js in .next/standalone output');
}
const appSub = findAppSubdir(distDir);
const appDir = path.join(distDir, appSub);

// 4. Place assets next to the server (standalone omits these), and copy externalized
//    native modules into the hoisted node_modules at the bundle root.
cp(path.join(root, '.next/static'), path.join(appDir, '.next/static'));
if (exists(path.join(root, 'public'))) cp(path.join(root, 'public'), path.join(appDir, 'public'));
for (const mod of ['better-sqlite3', 'sqlite-vec', 'bindings', 'file-uri-to-path']) {
  const src = path.join(root, 'node_modules', mod);
  if (exists(src)) cp(src, path.join(distDir, 'node_modules', mod));
}

// 5. Stable entry: a top-level launcher the Rust side always runs.
if (appSub !== '.') {
  fs.writeFileSync(
    path.join(distDir, 'server.js'),
    `// Auto-generated launcher: the Next standalone server is nested under a monorepo subpath.\nrequire(${JSON.stringify('./' + appSub + '/server.js')});\n`,
  );
}

// 6. Stage a PORTABLE Node runtime as a Tauri sidecar (named with the Rust target triple).
// macOS universal builds require BOTH arm64 and x64 binaries; stage them all.
await stageNode();

console.log('[sidecar] done.');

async function stageNode() {
  fs.mkdirSync(binDir, { recursive: true });

  const ver = process.version;
  const osPlatform = process.platform;

  if (osPlatform === 'win32') {
    throw new Error('Windows node staging not implemented yet — build Windows natively.');
  }

  // macOS universal builds need both arm64 and x64 sidecar binaries.
  const targets = osPlatform === 'darwin'
    ? [
        { nodeArch: 'arm64', rustTriple: 'aarch64-apple-darwin' },
        { nodeArch: 'x64',   rustTriple: 'x86_64-apple-darwin' },
      ]
    : [
        { nodeArch: process.arch === 'arm64' ? 'arm64' : 'x64', rustTriple: triple() },
      ];

  for (const { nodeArch, rustTriple } of targets) {
    const target = path.join(binDir, `node-${rustTriple}`);
    if (exists(target) && fs.statSync(target).size > 5_000_000) {
      console.log(`[sidecar] ${path.basename(target)} already staged, skipping.`);
      continue;
    }

    const platform = osPlatform === 'darwin' ? 'darwin' : 'linux';
    const name = `node-${ver}-${platform}-${nodeArch}`;
    const url = `https://nodejs.org/dist/${ver}/${name}.tar.gz`;
    const work = fs.mkdtempSync(path.join(os.tmpdir(), 'node-dl-'));
    const tgz = path.join(work, `${name}.tar.gz`);

    console.log(`[sidecar] downloading portable node: ${url}`);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to download node (${res.status}) from ${url}`);
    fs.writeFileSync(tgz, Buffer.from(await res.arrayBuffer()));

    execSync(`tar -xzf "${tgz}" -C "${work}" "${name}/bin/node"`);
    fs.copyFileSync(path.join(work, name, 'bin', 'node'), target);
    fs.chmodSync(target, 0o755);
    rmrf(work);
    console.log(`[sidecar] staged ${path.basename(target)} (${(fs.statSync(target).size / 1e6).toFixed(0)} MB)`);
  }
}

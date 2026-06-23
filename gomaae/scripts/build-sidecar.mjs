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
const nativeMods = ['better-sqlite3', 'sqlite-vec', 'bindings', 'file-uri-to-path'];
// Also copy all sqlite-vec-* platform packages (e.g. sqlite-vec-darwin-arm64)
// which contain the actual .dylib/.so and are optional deps not inlined by Next.
const allMods = [
  ...nativeMods,
  ...fs.readdirSync(path.join(root, 'node_modules')).filter(e => e.startsWith('sqlite-vec-')),
];
for (const mod of allMods) {
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
// macOS universal builds: Tauri bundler expects `node-universal-apple-darwin`,
// which we create by lipo-merging the arm64 and x64 binaries.
await stageNode();

console.log('[sidecar] done.');

async function downloadNode(ver, platform, arch, destPath) {
  const name = `node-${ver}-${platform}-${arch}`;
  const url = `https://nodejs.org/dist/${ver}/${name}.tar.gz`;
  const work = fs.mkdtempSync(path.join(os.tmpdir(), 'node-dl-'));
  const tgz = path.join(work, `${name}.tar.gz`);
  console.log(`[sidecar] downloading portable node: ${url}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download node (${res.status}) from ${url}`);
  fs.writeFileSync(tgz, Buffer.from(await res.arrayBuffer()));
  execSync(`tar -xzf "${tgz}" -C "${work}" "${name}/bin/node"`);
  fs.copyFileSync(path.join(work, name, 'bin', 'node'), destPath);
  fs.chmodSync(destPath, 0o755);
  rmrf(work);
  console.log(`[sidecar] staged ${path.basename(destPath)} (${(fs.statSync(destPath).size / 1e6).toFixed(0)} MB)`);
}

async function stageNode() {
  fs.mkdirSync(binDir, { recursive: true });

  const ver = process.version;

  if (process.platform === 'win32') {
    throw new Error('Windows node staging not implemented yet — build Windows natively.');
  }

  if (process.platform === 'darwin') {
    // Universal macOS build requires all three binaries:
    //   node-aarch64-apple-darwin  — checked by Rust build script during arm64 compile
    //   node-x86_64-apple-darwin   — checked by Rust build script during x64 compile
    //   node-universal-apple-darwin — required by the Tauri bundler
    const arm64Target = path.join(binDir, 'node-aarch64-apple-darwin');
    const x64Target   = path.join(binDir, 'node-x86_64-apple-darwin');
    const univTarget  = path.join(binDir, 'node-universal-apple-darwin');

    if (!exists(arm64Target) || fs.statSync(arm64Target).size < 5_000_000)
      await downloadNode(ver, 'darwin', 'arm64', arm64Target);
    else
      console.log('[sidecar] node-aarch64-apple-darwin already staged, skipping.');

    if (!exists(x64Target) || fs.statSync(x64Target).size < 5_000_000)
      await downloadNode(ver, 'darwin', 'x64', x64Target);
    else
      console.log('[sidecar] node-x86_64-apple-darwin already staged, skipping.');

    if (!exists(univTarget) || fs.statSync(univTarget).size < 10_000_000) {
      execSync(`lipo -create -output "${univTarget}" "${arm64Target}" "${x64Target}"`);
      console.log(`[sidecar] lipo'd universal node (${(fs.statSync(univTarget).size / 1e6).toFixed(0)} MB)`);
    } else {
      console.log('[sidecar] node-universal-apple-darwin already staged, skipping.');
    }
    return;
  }

  // Linux: stage the host-architecture binary.
  const hostTriple = triple();
  const target = path.join(binDir, `node-${hostTriple}`);
  if (exists(target) && fs.statSync(target).size > 5_000_000) {
    console.log('[sidecar] portable node already staged, skipping.');
    return;
  }
  const arch = process.arch === 'arm64' ? 'arm64' : 'x64';
  await downloadNode(ver, 'linux', arch, target);
}

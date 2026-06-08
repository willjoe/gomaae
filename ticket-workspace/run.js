#!/usr/bin/env node
'use strict';
/**
 * Ticket-linked agent runner (experimentation harness).
 *
 *   node run.js init-lab [--project <slug>]      provision a demo project workspace
 *   node run.js run <TICKET> [--rogue]           materialize -> mock agent -> gate
 *   node run.js status [<TICKET>]                show workspace manifests
 *   node run.js clean [<TICKET>]                 tear down ephemeral workspace(s)
 *
 * Default project slug: ticket-lab  (-> ~/Agentic/ticket-lab)
 */
const fs = require('fs');
const path = require('path');
const W = require('./lib/workspace');

function parse(rest) {
  const o = { slug: 'ticket-lab', rogue: false, args: [] };
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i];
    if (a === '--rogue') o.rogue = true;
    else if (a === '--project') o.slug = rest[++i];
    else o.args.push(a);
  }
  return o;
}

function seedRepository(slug) {
  const repo = path.join(W.projectRoot(slug), 'Repository');
  const files = {
    'package.json': JSON.stringify({ name: 'lab-app', version: '0.1.0' }, null, 2) + '\n',
    'README.md': '# Lab App\nCanonical repository for ticket-linked agent trials.\n',
    'src/api/users.js': 'export function listUsers() { return []; }\n',
    'src/api/auth.js': 'export function login() {}\n',
    'src/core/engine.js': 'export function run() {}\n',
    'src/core/secret.js': 'export const MASTER_KEY = "do-not-touch";\n',
    'docs/overview.md': '# Overview\n',
    'tests/users.test.js': 'test("users", () => {});\n',
  };
  for (const [rel, content] of Object.entries(files)) {
    const f = path.join(repo, rel);
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.writeFileSync(f, content);
  }
  return { repo, count: Object.keys(files).length };
}

function initLab(slug) {
  console.log(`\n▶ init-lab — provisioning ~/Agentic/${slug}`);
  W.ensureScaffold(slug);
  const { repo, count } = seedRepository(slug);
  if (!W.isGitRepo(repo)) {
    W.git(['init', '-q', '-b', 'main'], repo);
    W.git(['add', '-A'], repo);
    W.git(['-c', 'user.name=HIAD Seed', '-c', 'user.email=seed@hiad.local',
           'commit', '-q', '-m', 'chore: seed canonical repository'], repo);
  }
  const tickets = [
    { id: 'LAB-1', title: 'Add list-users endpoint', role: 'API Engineer', allowed_paths: ['src/api/**', 'tests/**'] },
    { id: 'LAB-2', title: 'Refresh product docs', role: 'Technical Writer', allowed_paths: ['docs/**'] },
  ];
  fs.writeFileSync(path.join(W.projectRoot(slug), 'Tickets', 'tickets.json'),
                   JSON.stringify(tickets, null, 2) + '\n');

  console.log(`  hierarchy : ${W.STANDARD_SUBDIRS.join('  ')}`);
  console.log(`  repository: git-initialized, ${count} seed files`);
  console.log(`  tickets   : ${tickets.map((t) => `${t.id} [${t.allowed_paths.join(', ')}]`).join('  |  ')}`);
  console.log(`✔ lab ready\n`);
}

function runTicket(slug, id, { rogue }) {
  const ticket = W.findTicket(slug, id);
  console.log(`\n▶ run ${id} — "${ticket.title}"  [${ticket.role}]${rogue ? '   (rogue mode)' : ''}`);
  console.log(`  allowed_paths: ${ticket.allowed_paths.join(', ')}`);

  const log = (m) => W.appendLog(path.join(W.workspaceDir(slug, id), 'agent.log'), m);
  const { repoDir, branch } = W.createTicketWorkspace(slug, ticket, { log: (m) => console.log('  · ' + m) });
  log(`provisioned on ${branch}`);

  const visible = W.listVisible(repoDir);
  console.log(`  visible to agent (${visible.length}): ${visible.join(', ')}`);
  if (!visible.includes('src/core/secret.js')) {
    console.log('    ↳ note: src/core/secret.js is NOT visible (presentation boundary holds)');
  }

  W.runMockAgent(repoDir, ticket, { rogue, log });

  const result = W.gate(repoDir, ticket.allowed_paths);
  console.log(`  changed: ${result.changed.join(', ') || '(none)'}`);

  if (result.ok) {
    const sha = W.commitWorkspace(repoDir, ticket);
    W.updateManifest(slug, id, { status: 'committed', commit: sha, changed: result.changed });
    log(`GATE PASS — committed ${sha} on ${branch}`);
    console.log(`  ✔ GATE PASS — committed ${sha} on ${branch} (canonical Repository untouched)\n`);
  } else {
    W.unstage(repoDir);
    W.updateManifest(slug, id, { status: 'rejected', violations: result.violations, changed: result.changed });
    log(`GATE REJECT — out-of-scope: ${result.violations.join(', ')}`);
    console.log(`  ✘ GATE REJECT — out-of-scope changes blocked: ${result.violations.join(', ')}`);
    console.log(`    nothing committed; canonical Repository untouched\n`);
  }
}

function status(slug, id) {
  const wsRoot = path.join(W.projectRoot(slug), 'Workspaces');
  if (!fs.existsSync(wsRoot)) return console.log('(no workspaces yet)');
  const ids = id ? [id] : fs.readdirSync(wsRoot).filter((d) => fs.statSync(path.join(wsRoot, d)).isDirectory());
  console.log(`\nWorkspaces in ~/Agentic/${slug}:`);
  for (const wid of ids) {
    const f = path.join(wsRoot, wid, 'manifest.json');
    if (!fs.existsSync(f)) continue;
    const m = JSON.parse(fs.readFileSync(f, 'utf8'));
    const tag = m.status === 'committed' ? `✔ ${m.commit}` : m.status === 'rejected' ? `✘ ${(m.violations || []).join(',')}` : m.status;
    console.log(`  ${wid.padEnd(8)} ${String(m.status).padEnd(10)} ${tag}`);
  }
  console.log('');
}

function clean(slug, id) {
  const wsRoot = path.join(W.projectRoot(slug), 'Workspaces');
  const targets = id ? [path.join(wsRoot, id)] : (fs.existsSync(wsRoot) ? fs.readdirSync(wsRoot).map((d) => path.join(wsRoot, d)) : []);
  targets.forEach((t) => fs.rmSync(t, { recursive: true, force: true }));
  console.log(`✔ cleaned ${targets.length} workspace(s)`);
}

function main() {
  const [, , cmd, ...rest] = process.argv;
  const o = parse(rest);
  try {
    switch (cmd) {
      case 'init-lab': return initLab(o.slug);
      case 'run':
        if (!o.args[0]) throw new Error('usage: run <TICKET> [--rogue]');
        return runTicket(o.slug, o.args[0], { rogue: o.rogue });
      case 'status': return status(o.slug, o.args[0]);
      case 'clean': return clean(o.slug, o.args[0]);
      default:
        console.log('commands: init-lab | run <TICKET> [--rogue] | status [<TICKET>] | clean [<TICKET>]   [--project <slug>]');
    }
  } catch (e) {
    console.error(`\n✘ ${e.message}\n`);
    process.exit(1);
  }
}

main();

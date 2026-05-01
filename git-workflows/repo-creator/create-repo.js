#!/usr/bin/env node

/**
 * Zero-Trust Repository Creator
 * Initializes a new Git repository and stamps it with the un-bypassable
 * pre-commit enforcement hooks tailored to the specific domain type.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const args = process.argv.slice(2);
if (args.length < 2) {
  console.error("Usage: node create-repo.js <target-directory> <project-type>");
  console.error("Available types: frontend, backend, ml, common");
  process.exit(1);
}

const [targetDir, projectType] = args;
const absoluteTarget = path.resolve(targetDir);
const templatesDir = path.join(__dirname, 'hook-templates');

// 1. Validate Project Type
const typeHookPath = path.join(templatesDir, `${projectType}.sh`);
const commonHookPath = path.join(templatesDir, 'common.sh');

if (projectType !== 'common' && !fs.existsSync(typeHookPath)) {
  console.error(`❌ Error: Unknown project type '${projectType}'. No hook template found.`);
  process.exit(1);
}

// 2. Initialize Git Repository
if (!fs.existsSync(absoluteTarget)) {
  fs.mkdirSync(absoluteTarget, { recursive: true });
}

console.log(`📦 Initializing Zero-Trust ${projectType.toUpperCase()} repository at ${absoluteTarget}...`);
try {
  execSync('git init', { cwd: absoluteTarget, stdio: 'ignore' });
} catch (e) {
  console.error("❌ Error initializing git repository.");
  process.exit(1);
}

// 3. Assemble the Pre-Commit Hook
const hookPath = path.join(absoluteTarget, '.git', 'hooks', 'pre-commit');

let finalHookContent = "#!/bin/bash\nset -e\n\n";

// Always inject common enforcement rules
if (fs.existsSync(commonHookPath)) {
  finalHookContent += fs.readFileSync(commonHookPath, 'utf8') + "\n";
}

// Inject domain-specific enforcement rules
if (projectType !== 'common' && fs.existsSync(typeHookPath)) {
  finalHookContent += fs.readFileSync(typeHookPath, 'utf8') + "\n";
}

// 4. Write and secure the hook
fs.writeFileSync(hookPath, finalHookContent, { mode: 0o755 });

console.log(`🔒 Strict ${projectType.toUpperCase()} pre-commit hooks successfully installed and secured.`);
console.log(`✅ Repository creation complete.`);

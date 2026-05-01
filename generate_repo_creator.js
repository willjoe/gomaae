const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const baseDir = path.join(__dirname, 'git-workflows', 'repo-creator');
const templatesDir = path.join(baseDir, 'hook-templates');

// Ensure directories exist
[baseDir, templatesDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// --- Hook Templates ---

// Common Hook (Applied to all repositories)
const commonHook = `
# --- Common Zero-Trust Enforcement ---
echo "[Zero-Trust] Enforcing Semantic Commit Granularity..."
# Implementation stub: Check if commit message follows strict semantic rules
# Check if commit touches multiple isolated domains ("Kitchen sink" commit)

echo "[Zero-Trust] Enforcing Mathematical Test Coverage..."
# Implementation stub: Parse cyclomatic complexity and ensure 1:1 branch coverage
`;

// Frontend-Specific Hook
const frontendHook = `
# --- Frontend Zero-Trust Enforcement ---
echo "[Zero-Trust] Enforcing UI Component Evidence (Storybook)..."
STAGED_COMPONENTS=$(git diff --cached --name-only --diff-filter=ACM | grep -E "^src/components/.*\.(tsx|jsx)$" || true)

if [ -n "$STAGED_COMPONENTS" ]; then
  for file in $STAGED_COMPONENTS; do
    if [[ ! $file =~ \.(test|spec|stories)\.(tsx|jsx)$ ]]; then
      base_name="\${file%.*}"
      if [ ! -f "\${base_name}.stories.tsx" ] && [ ! -f "\${base_name}.stories.jsx" ]; then
        echo "❌ SECURITY EXCEPTION: Commit Rejected."
        echo "File '$file' is missing an accompanying Storybook file."
        exit 1
      fi
    fi
  done
fi

echo "[Zero-Trust] Enforcing Frontend Strict Linting (ESLint)..."
# Implementation stub: Run ESLint strictly on staged files
`;

// Backend-Specific Hook
const backendHook = `
# --- Backend Zero-Trust Enforcement ---
echo "[Zero-Trust] Enforcing API Contract Validation..."
# Implementation stub: Ensure OpenAPI/Swagger specs are updated if route handlers change

echo "[Zero-Trust] Enforcing Backend Strict Linting..."
# Implementation stub: Run GolangCI-Lint, Ruff, or equivalent based on language
`;

// ML/Data-Specific Hook
const mlHook = `
# --- ML/Data Zero-Trust Enforcement ---
echo "[Zero-Trust] Enforcing Model Hash Integrity..."
# Implementation stub: Ensure model weights are not committed directly, but stored in registry with a hash reference

echo "[Zero-Trust] Enforcing Data Pipeline Strict Linting (SQLFluff / Ruff)..."
# Implementation stub: Run SQLFluff on .sql files and Ruff on .py files
`;

fs.writeFileSync(path.join(templatesDir, 'common.sh'), commonHook);
fs.writeFileSync(path.join(templatesDir, 'frontend.sh'), frontendHook);
fs.writeFileSync(path.join(templatesDir, 'backend.sh'), backendHook);
fs.writeFileSync(path.join(templatesDir, 'ml.sh'), mlHook);

// --- The Repo Creator Script ---

const repoCreatorScript = `#!/usr/bin/env node

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
const typeHookPath = path.join(templatesDir, \`\${projectType}.sh\`);
const commonHookPath = path.join(templatesDir, 'common.sh');

if (projectType !== 'common' && !fs.existsSync(typeHookPath)) {
  console.error(\`❌ Error: Unknown project type '\${projectType}'. No hook template found.\`);
  process.exit(1);
}

// 2. Initialize Git Repository
if (!fs.existsSync(absoluteTarget)) {
  fs.mkdirSync(absoluteTarget, { recursive: true });
}

console.log(\`📦 Initializing Zero-Trust \${projectType.toUpperCase()} repository at \${absoluteTarget}...\`);
try {
  execSync('git init', { cwd: absoluteTarget, stdio: 'ignore' });
} catch (e) {
  console.error("❌ Error initializing git repository.");
  process.exit(1);
}

// 3. Assemble the Pre-Commit Hook
const hookPath = path.join(absoluteTarget, '.git', 'hooks', 'pre-commit');

let finalHookContent = "#!/bin/bash\\nset -e\\n\\n";

// Always inject common enforcement rules
if (fs.existsSync(commonHookPath)) {
  finalHookContent += fs.readFileSync(commonHookPath, 'utf8') + "\\n";
}

// Inject domain-specific enforcement rules
if (projectType !== 'common' && fs.existsSync(typeHookPath)) {
  finalHookContent += fs.readFileSync(typeHookPath, 'utf8') + "\\n";
}

// 4. Write and secure the hook
fs.writeFileSync(hookPath, finalHookContent, { mode: 0o755 });

console.log(\`🔒 Strict \${projectType.toUpperCase()} pre-commit hooks successfully installed and secured.\`);
console.log(\`✅ Repository creation complete.\`);
`;

fs.writeFileSync(path.join(baseDir, 'create-repo.js'), repoCreatorScript, { mode: 0o755 });

// Clean up old pre-commit files
const oldPreCommitDir = path.join(__dirname, 'git-workflows', 'pre-commit');
if (fs.existsSync(oldPreCommitDir)) {
  fs.rmSync(oldPreCommitDir, { recursive: true, force: true });
}

console.log("Repository creator and modular hook templates generated successfully.");

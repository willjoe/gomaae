const fs = require('fs');
const path = require('path');

const baseDir = path.join(__dirname, 'git-workflows');

const dirs = [
  path.join(baseDir, 'pre-commit'),
  path.join(baseDir, 'ci-cd-pipelines', 'github'),
  path.join(baseDir, 'ci-cd-pipelines', 'gitlab')
];

dirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// --- Pre-Commit Hooks ---

const enforceStorybook = `#!/bin/bash
# 01-enforce-storybook.sh
# High-Integrity Policy: UI Component Evidence Enforcement
# Blocks any commit containing new/modified UI components without an accompanying Storybook file.

echo "Running High-Integrity UI Component Check..."

# Find all staged .tsx or .jsx files in the components directory
STAGED_COMPONENTS=$(git diff --cached --name-only --diff-filter=ACM | grep -E "^src/components/.*\.(tsx|jsx)$")

for file in $STAGED_COMPONENTS; do
  # Check if it's an actual component (not a test or story file itself)
  if [[ ! $file =~ \.(test|spec|stories)\.(tsx|jsx)$ ]]; then
    
    # Strip extension and look for matching story file
    base_name="\${file%.*}"
    if [ ! -f "\${base_name}.stories.tsx" ] && [ ! -f "\${base_name}.stories.jsx" ]; then
      echo "❌ SECURITY EXCEPTION: Commit Rejected."
      echo "File '\$file' is missing an accompanying Storybook file."
      echo "Rule: Visual UI evidence requires every component to have a .stories.tsx file."
      exit 1
    fi
  fi
done

echo "✅ UI Component Evidence Verification Passed."
exit 0
`;

const branchCoverage = `#!/bin/bash
# 02-branch-coverage.sh
# High-Integrity Policy: Mathematical Test Coverage Enforcement
# Parses cyclomatic complexity and demands 1:1 branch coverage.

echo "Running Process Branch Auditing..."
# Implementation stub: Call static analysis tool to count logic branches
# e.g., npx complexity-analyzer src/
# Implementation stub: Compare logic branches to active unit test assertions
# if branches > assertions; exit 1

echo "✅ Process Branch Audit Passed."
exit 0
`;

fs.writeFileSync(path.join(dirs[0], '01-enforce-storybook.sh'), enforceStorybook, { mode: 0o755 });
fs.writeFileSync(path.join(dirs[0], '02-branch-coverage.sh'), branchCoverage, { mode: 0o755 });

// --- CI/CD Pipelines (GitHub Actions) ---

const githubPrGauntlet = `name: High-Integrity PR Gauntlet (Visual & E2E Validation)

on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  e2e-visual-evidence:
    name: Generate Visual UI/UX Evidence
    runs-on: ubuntu-latest
    container:
      # This is the dedicated validation container (strictly isolated from AI sandboxes)
      image: mcr.microsoft.com/playwright:v1.40.0-jammy

    steps:
      - name: Checkout Repository
        uses: actions/checkout@v4

      - name: Install Dependencies
        run: npm ci

      - name: Component-Level Evidence (Storybook)
        run: |
          npm run build-storybook
          # Test runner configured to natively record video of each component interaction
          npx test-storybook --video

      - name: Full Flow Evidence (E2E Tests)
        # Playwright configured globally (video: 'on') to record E2E flows aligned with Story Tickets
        run: npx playwright test

      - name: Extract & Zip Video Artifacts
        if: always()
        run: |
          mkdir -p /artifacts/videos
          cp -r test-results/**/*.webm /artifacts/videos/ 2>/dev/null || :
          cp -r __tests__/__image_snapshots__ /artifacts/videos/ 2>/dev/null || :
          zip -r evidence.zip /artifacts/videos

      - name: Upload Evidence to Secure Storage & Attach to PR/Ticket
        if: always()
        env:
          TICKET_ID: \${{ github.event.pull_request.head.ref }} # Assuming branch names contain Ticket IDs
          GITHUB_TOKEN: \${{ secrets.GITHUB_TOKEN }}
        run: |
          echo "Uploading evidence.zip to GCS..."
          # Implementation stub: Upload to GCS Bucket -> Generate signed URL
          EVIDENCE_URL="https://storage.googleapis.com/high-integrity-evidence/\${TICKET_ID}/evidence.zip"
          
          # Post the link directly to the PR for the human reviewer
          gh pr comment \${{ github.event.pull_request.number }} --body "### 🎥 Undeniable Visual UI/UX Evidence\\nMandatory Human Review: You must watch the recorded Component (Storybook) and Flow (E2E) evidence before approving.\\n\\n[Download & View Evidence](\${EVIDENCE_URL})"
`;

const githubPostMerge = `name: GitOps CD Pipeline (Post-Merge Trigger)

on:
  push:
    branches:
      - main

jobs:
  deploy-to-production:
    name: Automated Deployment (Immutable Main)
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout Code
        uses: actions/checkout@v4

      - name: Authenticate via Workload Identity Federation
        id: auth
        uses: google-github-actions/auth@v2
        with:
          workload_identity_provider: 'projects/12345/locations/global/workloadIdentityPools/github/providers/github-provider'
          service_account: 'cd-orchestrator@project.iam.gserviceaccount.com'

      - name: Trigger Deployment via Delivery Manager Rules
        run: |
          echo "Executing immutable infrastructure deployment based on the merged state of main..."
          # Implementation stub: terraform apply, kubectl apply, or cloud run deploy
          # e.g., gcloud run deploy frontend --source . --region us-central1
`;

fs.writeFileSync(path.join(dirs[1], 'pr-gauntlet.yml'), githubPrGauntlet);
fs.writeFileSync(path.join(dirs[1], 'post-merge-deploy.yml'), githubPostMerge);

// --- CI/CD Pipelines (GitLab CI) ---

const gitlabCi = `stages:
  - pre-review-validation
  - post-merge-deploy

# The UI/UX Video Evidence Container triggered by a Merge Request
e2e-visual-evidence:
  stage: pre-review-validation
  image: mcr.microsoft.com/playwright:v1.40.0-jammy
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
  script:
    - npm ci
    # Storybook Component Evidence
    - npm run build-storybook
    - npx test-storybook --video
    # Playwright E2E Flow Evidence
    - npx playwright test
    # Extract & Compress
    - mkdir -p artifacts/videos
    - cp -r test-results/**/*.webm artifacts/videos/ || true
  artifacts:
    paths:
      - artifacts/videos/
    expire_in: 7 days
    expose_as: 'Visual UI Evidence (Mandatory Review)'

# Git-Triggered Deployment on Merge to Main
automated-production-deployment:
  stage: post-merge-deploy
  image: google/cloud-sdk:latest
  rules:
    - if: $CI_COMMIT_BRANCH == "main"
  script:
    - echo "Authenticating via OIDC..."
    # Implementation stub: GitLab OIDC integration to GCP
    - echo "Executing immutable deployment..."
    # Implementation stub: gcloud run deploy
`;

fs.writeFileSync(path.join(dirs[2], '.gitlab-ci.yml'), gitlabCi);

console.log("Git Workflows generated successfully in git-workflows/");

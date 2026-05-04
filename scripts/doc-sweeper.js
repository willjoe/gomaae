#!/usr/bin/env node

/**
 * AI-Powered Documentation Sweeper
 * 
 * This script identifies non-executable documentation files in the repository,
 * uses an AI agent to summarize/categorize them, and prepares them for
 * migration to dedicated platforms (Notion/Linear).
 * 
 * Logic:
 * 1. Crawl repository for .md, .pdf, .png (diagrams).
 * 2. Filter out core High-Integrity files (README.md, .agent_state/).
 * 3. Use an LLM to determine:
 *    - Platform Target (Notion vs Linear)
 *    - Document Category (PRD, TDD, Workflow, Architecture)
 *    - Summary for the migration log.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration: Files to ignore in the sweep
const IGNORE_LIST = [
  'README.md',
  'SUMMARY.md',
  'CONTRIBUTING.md',
  'LICENSE',
  '.agent_state/',
  'node_modules/'
];

// Target Extensions for migration
const DOC_EXTENSIONS = ['.md', '.txt', '.pdf', '.png', '.jpg', '.jpeg'];

function getAllFiles(dirPath, arrayOfFiles = []) {
  const files = fs.readdirSync(dirPath);

  files.forEach(function(file) {
    const fullPath = path.join(dirPath, file);
    const relativePath = path.relative(process.cwd(), fullPath);

    if (IGNORE_LIST.some(ignore => relativePath.startsWith(ignore))) {
      return;
    }

    if (fs.statSync(fullPath).isDirectory()) {
      arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
    } else {
      if (DOC_EXTENSIONS.includes(path.extname(file).toLowerCase())) {
        arrayOfFiles.push(relativePath);
      }
    }
  });

  return arrayOfFiles;
}

/**
 * MOCK AI Categorization Function
 * In a real implementation, this would call the 'invoke_agent' tool
 * or a local LLM to analyze the file content.
 */
async function analyzeFileWithAI(filePath) {
  const content = fs.readFileSync(filePath, 'utf8').substring(0, 1000); // Send first 1k chars
  
  // Simulation of AI reasoning
  let category = "General Knowledge";
  let target = "Notion";
  
  if (content.includes("PRD") || content.includes("Requirements")) {
    category = "Product Requirement";
    target = "Linear";
  } else if (content.includes("Architecture") || content.includes("TDD")) {
    category = "Technical Design";
    target = "Notion";
  }

  return {
    filePath,
    category,
    target,
    summary: `AI analyzed ${filePath} and identified it as ${category}.`
  };
}

async function runSweep() {
  console.log("🔍 Starting AI Documentation Sweep...");
  
  const files = getAllFiles(process.cwd());
  console.log(`Found ${files.length} candidate documents for migration.\n`);

  const migrationManifest = [];

  for (const file of files) {
    console.log(`Analyzing: ${file}...`);
    const analysis = await analyzeFileWithAI(file);
    migrationManifest.push(analysis);
  }

  // Write the manifest for human/architect review before deletion
  const manifestPath = 'migration_manifest.json';
  fs.writeFileSync(manifestPath, JSON.stringify(migrationManifest, null, 2));

  console.log(`\n✅ Sweep Complete. Manifest generated at ${manifestPath}`);
  console.log("Next Step: Review the manifest and run 'doc-extractor --execute' to push to platforms.");
}

runSweep();

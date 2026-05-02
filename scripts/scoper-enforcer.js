#!/usr/bin/env node

/**
 * Scoper Enforcement Gate
 * 
 * This script verifies that all files modified or created in a Pull Request
 * strictly adhere to the 'allow_write' scope defined in the associated ticket.
 * 
 * Usage: 
 *   node scoper-enforcer.js --ticket-metadata='{"allow_write": ["src/api/", "tests/"]}' --base-branch=main
 */

const { execSync } = require('child_process');
const path = require('path');

function getChangedFiles(baseBranch) {
  try {
    // Get list of files changed between baseBranch and current HEAD
    const output = execSync(`git diff --name-only ${baseBranch}...HEAD`, { encoding: 'utf8' });
    return output.split('\n').filter(Boolean);
  } catch (error) {
    console.error(`Error fetching changed files: ${error.message}`);
    process.exit(1);
  }
}

function isWithinScope(filePath, allowWrite) {
  return allowWrite.some(scope => {
    // Exact match
    if (filePath === scope) return true;
    
    // Directory match (scope ends with /)
    if (scope.endsWith('/') && filePath.startsWith(scope)) return true;
    
    // Fallback: treat as directory even without trailing slash if it's a directory in the scope
    if (filePath.startsWith(scope + '/')) return true;

    return false;
  });
}

function run() {
  const args = process.argv.slice(2);
  const metadataArg = args.find(a => a.startsWith('--ticket-metadata='));
  const baseBranchArg = args.find(a => a.startsWith('--base-branch='));

  if (!metadataArg) {
    console.error('Error: --ticket-metadata argument is required.');
    process.exit(1);
  }

  const baseBranch = baseBranchArg ? baseBranchArg.split('=')[1] : 'main';
  let metadata;

  try {
    metadata = JSON.parse(metadataArg.split('=')[1]);
  } catch (e) {
    console.error('Error: Invalid JSON in --ticket-metadata.');
    process.exit(1);
  }

  const allowWrite = metadata.allow_write || [];
  if (allowWrite.length === 0) {
    console.error('Error: No allow_write scope defined in ticket metadata.');
    process.exit(1);
  }

  console.log(`Checking changes against scope: ${JSON.stringify(allowWrite)}`);
  
  const changedFiles = getChangedFiles(baseBranch);
  const unauthorizedFiles = [];

  for (const file of changedFiles) {
    if (!isWithinScope(file, allowWrite)) {
      unauthorizedFiles.push(file);
    }
  }

  if (unauthorizedFiles.length > 0) {
    console.error('\n❌ SCOPER ENFORCEMENT FAILURE');
    console.error('The following files are modified outside the authorized scope:');
    unauthorizedFiles.forEach(f => console.error(`  - ${f}`));
    console.error('\nPlease ensure your changes are restricted to the directories/files defined in the ticket.');
    process.exit(1);
  }

  console.log('\n✅ SCOPER ENFORCEMENT PASSED');
  console.log(`${changedFiles.length} files verified within authorized scope.`);
  process.exit(0);
}

run();

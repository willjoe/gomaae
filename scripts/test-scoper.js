const { execSync } = require('child_process');

// Mocked logic for testing
function isWithinScope(filePath, allowWrite) {
  return allowWrite.some(scope => {
    if (filePath === scope) return true;
    if (scope.endsWith('/') && filePath.startsWith(scope)) return true;
    if (filePath.startsWith(scope + '/')) return true;
    return false;
  });
}

const testCases = [
  {
    name: "Exact file match",
    scope: ["src/api/user.ts"],
    file: "src/api/user.ts",
    expected: true
  },
  {
    name: "Directory match with trailing slash",
    scope: ["src/api/"],
    file: "src/api/user.ts",
    expected: true
  },
  {
    name: "Directory match without trailing slash",
    scope: ["src/api"],
    file: "src/api/user.ts",
    expected: true
  },
  {
    name: "Outside scope",
    scope: ["src/api/"],
    file: "src/web/index.ts",
    expected: false
  },
  {
    name: "Partial directory match (should fail)",
    scope: ["src/api"],
    file: "src/api-v2/user.ts",
    expected: false
  }
];

console.log("Running Scoper Enforcer Logic Tests...\n");

let passed = 0;
testCases.forEach(tc => {
  const result = isWithinScope(tc.file, tc.scope);
  if (result === tc.expected) {
    console.log(`✅ [PASS] ${tc.name}`);
    passed++;
  } else {
    console.log(`❌ [FAIL] ${tc.name} (Expected ${tc.expected}, got ${result})`);
  }
});

console.log(`\nTests Completed: ${passed}/${testCases.length} passed.`);
if (passed !== testCases.length) process.exit(1);

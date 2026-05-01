const https = require('https');
require('dotenv').config();

const API_KEY = process.env.LINEAR_API_KEY;
const TEAM_ID = "73b178bf-4f15-4a66-9620-30485c15e091";
const PROJECT_ID = "588536a9-9d02-426a-a4e2-22822c55c4e2";

if (!API_KEY) {
  console.error("Missing LINEAR_API_KEY in .env");
  process.exit(1);
}

async function queryLinear(query, variables = {}) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ query, variables });
    const req = https.request('https://api.linear.app/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': API_KEY,
        'Content-Length': Buffer.byteLength(data)
      }
    }, res => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          if (json.errors) reject(json.errors);
          else resolve(json.data);
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function run() {
  try {
    // Create Story Issue
    const storyRes = await queryLinear(`
      mutation CreateStory($teamId: String!, $projectId: String!, $title: String!, $desc: String!) {
        issueCreate(input: { teamId: $teamId, projectId: $projectId, title: $title, description: $desc }) {
          issue { id title }
        }
      }
    `, {
      teamId: TEAM_ID,
      projectId: PROJECT_ID,
      title: "Story: Token Governance Sandbox & Monitoring",
      desc: "Implement the token budget constraints and kill-switch execution logic within the sandbox environments.\n\n**Required QA:** Verify token kill-switch correctly halts execution."
    });
    const storyId = storyRes.issueCreate.issue.id;
    console.log("Created Story:", storyRes.issueCreate.issue.title);

    // Create Tasks under the Story
    const tasks = [
      {
        title: "Task: Implement Budget-Aware Token Interceptor",
        desc: "**Assignee Role:** API Engineer\n**Mutation Scope:** `sandbox-orchestrator/src/orchestrator.js`\n**Estimated Token Usage:** 15000\n\nBuild the token interceptor that reads the cumulative usage and blocks execution if the budget is exceeded."
      },
      {
        title: "Task: FinOps Dashboard Analytics",
        desc: "**Assignee Role:** FinOps Engineer\n**Mutation Scope:** `sandbox-orchestrator/src/reporting.js`\n**Estimated Token Usage:** 25000\n\nImplement the reporting loop to sync token usage back to the ticket's `Token Usage Reporting` field."
      },
      {
        title: "Task: Test Hard Kill-Switch Trigger",
        desc: "**Assignee Role:** Functional QA Eng.\n**Mutation Scope:** `tests/e2e/token-kill-switch.spec.js`\n**Estimated Token Usage:** 10000\n\nWrite an integration test to ensure the container is terminated cleanly when usage surpasses the allocated token ceiling."
      }
    ];

    for (const task of tasks) {
      const taskRes = await queryLinear(`
        mutation CreateTask($teamId: String!, $parentId: String!, $title: String!, $desc: String!) {
          issueCreate(input: { teamId: $teamId, parentId: $parentId, title: $title, description: $desc }) {
            issue { id title }
          }
        }
      `, {
        teamId: TEAM_ID,
        parentId: storyId,
        title: task.title,
        desc: task.desc
      });
      console.log("Created Task:", taskRes.issueCreate.issue.title);
    }
  } catch (err) {
    console.error("Error:", JSON.stringify(err, null, 2));
  }
}

run();

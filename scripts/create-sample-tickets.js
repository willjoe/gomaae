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

async function getOrCreateLabel(name) {
  // Note: GraphQL filter syntax for exact match.
  const res = await queryLinear(`
    query GetLabel($name: String!) {
      issueLabels(filter: { name: { eq: $name } }) {
        nodes { id name }
      }
    }
  `, { name });
  
  if (res.issueLabels && res.issueLabels.nodes.length > 0) {
    return res.issueLabels.nodes[0].id;
  }
  
  const createRes = await queryLinear(`
    mutation CreateLabel($teamId: String!, $name: String!) {
      issueLabelCreate(input: { teamId: $teamId, name: $name }) {
        issueLabel { id name }
      }
    }
  `, { teamId: TEAM_ID, name });
  
  return createRes.issueLabelCreate.issueLabel.id;
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
      title: "Story: Labeled Roles & UI Evidence Strategy",
      desc: "Implement the updated task verification strategy utilizing Linear labels for AI role assignment.\n\n**Required QA:** Verify tasks have the correct Role label applied."
    });
    const storyId = storyRes.issueCreate.issue.id;
    console.log("Created Story:", storyRes.issueCreate.issue.title);

    // Create Tasks under the Story
    const tasks = [
      {
        title: "Task: Modify Linear Orchestrator Connector",
        role: "API Engineer",
        desc: "**Mutation Scope:** `connectors/ticket-systems/linear-connector.js`\n**Estimated Token Usage:** 12000\n\nUpdate the ticket metadata fetcher to parse 'Role' labels instead of the description body."
      },
      {
        title: "Task: Implement Issue Label Caching",
        role: "Backend Engineer",
        desc: "**Mutation Scope:** `sandbox-orchestrator/src/orchestrator.js`\n**Estimated Token Usage:** 18000\n\nImprove performance by caching Linear role labels during the queue processor step."
      },
      {
        title: "Task: Update Role Label Validation Specs",
        role: "Functional QA Eng.",
        desc: "**Mutation Scope:** `tests/e2e/linear-webhook.spec.js`\n**Estimated Token Usage:** 8000\n\nEnsure tests correctly assert that a ticket without a 'Role: *' label is rejected."
      }
    ];

    for (const task of tasks) {
      const labelName = "Role: " + task.role;
      const labelId = await getOrCreateLabel(labelName);
      
      const taskRes = await queryLinear(`
        mutation CreateTask($teamId: String!, $parentId: String!, $title: String!, $desc: String!, $labelIds: [String!]) {
          issueCreate(input: { teamId: $teamId, parentId: $parentId, title: $title, description: $desc, labelIds: $labelIds }) {
            issue { id title }
          }
        }
      `, {
        teamId: TEAM_ID,
        parentId: storyId,
        title: task.title,
        desc: task.desc,
        labelIds: [labelId]
      });
      console.log("Created Task: " + taskRes.issueCreate.issue.title + " [Label: " + labelName + "]");
    }
  } catch (err) {
    console.error("Error:", JSON.stringify(err, null, 2));
  }
}

run();

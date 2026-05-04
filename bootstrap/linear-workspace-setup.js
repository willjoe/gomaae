/**
 * Linear Workspace Bootstrapper
 * 
 * This script is designed to be run ONCE when setting up a brand new Linear workspace
 * for the High-Integrity Atomic Development architecture.
 * 
 * It automates the creation of:
 * 1. The core Engineering Team
 * 2. The required Workflow States (ToDo, In Progress, In Review, Done, Canceled)
 * 3. The foundational AI Role Labels
 */

const https = require('https');
require('dotenv').config();

const API_KEY = process.env.LINEAR_API_KEY;

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
          resolve(JSON.parse(body));
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

async function bootstrapLinearWorkspace() {
  console.log("🚀 Bootstrapping High-Integrity Linear Workspace...");

  try {
    // 1. Create the Core Team
    console.log("\\n--- 1. Creating Team ---");
    const teamRes = await queryLinear(`
      mutation {
        teamCreate(input: {
          name: "High-Integrity Atomic Development",
          key: "CHA"
        }) {
          team { id name key }
          success
        }
      }
    `);

    let teamId;
    if (teamRes.data && teamRes.data.teamCreate && teamRes.data.teamCreate.success) {
      teamId = teamRes.data.teamCreate.team.id;
      console.log(\`✅ Created Team: \${teamRes.data.teamCreate.team.name} (\${teamRes.data.teamCreate.team.key})\`);
    } else {
      console.log("⚠️ Team creation failed or already exists. Please provide an existing TEAM_ID to continue.");
      console.log(JSON.stringify(teamRes.errors, null, 2));
      return;
    }

    // 2. Configure Workflow States
    console.log("\\n--- 2. Configuring Workflow States ---");
    const states = [
      { name: "In Review", type: "started", color: "#F2C94C" }
      // Linear auto-generates Todo, In Progress, Done, Canceled on team creation.
      // We only need to inject our custom 'In Review' state.
    ];

    for (const state of states) {
      const stateRes = await queryLinear(`
        mutation CreateState($teamId: String!, $name: String!, $type: String!, $color: String!) {
          workflowStateCreate(input: {
            teamId: $teamId,
            name: $name,
            type: $type,
            color: $color
          }) {
            workflowState { id name }
          }
        }
      `, { teamId, name: state.name, type: state.type, color: state.color });
      
      if (stateRes.data && stateRes.data.workflowStateCreate) {
        console.log(\`✅ Added Custom State: \${state.name}\`);
      }
    }

    // 3. Create Core Role Labels
    console.log("\\n--- 3. Provisioning High-Integrity Role Labels ---");
    const coreRoles = [
      "Frontend Web Eng.",
      "API Engineer",
      "Functional QA Eng.",
      "Security Engineer",
      "Delivery Manager"
    ];

    for (const role of coreRoles) {
      const labelRes = await queryLinear(`
        mutation CreateLabel($teamId: String!, $name: String!) {
          issueLabelCreate(input: { teamId: $teamId, name: $name }) {
            issueLabel { id name }
          }
        }
      `, { teamId, name: \`Role: \${role}\` });

      if (labelRes.data && labelRes.data.issueLabelCreate) {
        console.log(\`✅ Created Label: Role: \${role}\`);
      }
    }

    console.log("\\n🎉 Workspace Bootstrap Complete!");
    console.log(\`Ensure your TEAM_ID (\${teamId}) is saved in your orchestrator environment variables.\`);

  } catch (error) {
    console.error("❌ Fatal Error during bootstrap:", error);
  }
}

bootstrapLinearWorkspace();

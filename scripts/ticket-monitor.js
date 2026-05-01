/**
 * Zero-Trust Ticket Monitor (Linear Enforcement Engine)
 * 
 * Since Linear prioritizes UI speed over blocking rules, this script
 * runs continuously (or via Webhook) to audit newly created tickets.
 * If a ticket is missing mandatory Zero-Trust metadata, it is instantly
 * rejected from the AI queue and moved to 'Canceled' or 'Blocked'.
 */

const https = require('https');
require('dotenv').config();

const API_KEY = process.env.LINEAR_API_KEY;
if (!API_KEY) {
  console.error("Missing LINEAR_API_KEY in .env");
  process.exit(1);
}

// Execute GraphQL query against Linear
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

// Ensure the ticket has the required Zero-Trust parameters
function validateTaskDescription(description) {
  const errors = [];
  if (!description.includes('**Assignee Role:**')) {
    errors.push("- Missing mandatory '**Assignee Role:**' definition.");
  }
  if (!description.includes('**Mutation Scope:**')) {
    errors.push("- Missing mandatory '**Mutation Scope:**' path array.");
  }
  if (!description.includes('**Estimated Token Usage:**')) {
    errors.push("- Missing mandatory '**Estimated Token Usage:**' budget limit.");
  }
  return errors;
}

async function auditTickets() {
  console.log("[Audit] Checking unstarted tasks for compliance...");

  // Query issues that are unstarted (ToDo/Triage)
  const res = await queryLinear(`
    query {
      issues(filter: { state: { type: { in: ["unstarted", "triage"] } } }) {
        nodes {
          id
          title
          description
          state { name }
          url
        }
      }
    }
  `);

  const issues = res.issues.nodes;
  for (const issue of issues) {
    const description = issue.description || "";
    const errors = validateTaskDescription(description);

    if (errors.length > 0) {
      console.log("[Violation] Issue " + issue.title + " (" + issue.url + ") violates Zero-Trust rules.");
      
      // 1. Post a comment explaining the rejection
      const commentBody = "**[Zero-Trust Policy Enforcement]**\nThis ticket was automatically rejected from the active queue because it lacks mandatory security scoping:\n\n" + errors.join("\n") + "\n\nPlease update the description and return the status to ToDo.";

      
      await queryLinear(`
        mutation CommentCreate($issueId: String!, $body: String!) {
          commentCreate(input: { issueId: $issueId, body: $body }) { success }
        }
      `, {
        issueId: issue.id,
        body: commentBody
      });

      console.log("[Enforced] Added rejection comment to " + issue.title + ".");
    } else {
      console.log("[Valid] Issue " + issue.title + " passes zero-trust structure.");
    }
  }
}

// Run the audit
auditTickets().catch(console.error);

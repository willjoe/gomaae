import { db } from './db';

const API_KEY = process.env.LINEAR_API_KEY || "lin_api_WphFzBzRZy8JestHTSAYnXz0oDABCucMPGXiJGSj";
const TEAM_ID = "784f63ce-8148-47a8-9146-fe60c946e587";

async function linearGraphQL(query: string, variables = {}) {
  const res = await fetch("https://api.linear.app/graphql", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": API_KEY },
    body: JSON.stringify({ query, variables })
  });
  return await res.json();
}

export async function runSyncCycle() {
  console.log(`[${new Date().toISOString()}] Starting sync cycle...`);
  
  // 1. Inbound: Linear -> SQLite
  const q = `query { issues(first: 50, orderBy: updatedAt) { nodes { id identifier title description state { name } updatedAt } } }`;
  try {
    const res = await linearGraphQL(q);
    const issues = res.data?.issues?.nodes || [];
    
    const upsert = db.prepare(`
      INSERT INTO tickets (id, identifier, title, description, status, linear_updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET 
        identifier=excluded.identifier,
        title=excluded.title,
        description=excluded.description,
        status=excluded.status,
        linear_updated_at=excluded.linear_updated_at
    `);

    for (const issue of issues) {
      upsert.run(issue.id, issue.identifier, issue.title, issue.description || '', issue.state.name, issue.updatedAt);
    }
  } catch (err) {
    console.error("Inbound sync failed:", err);
  }

  // 2. Outbound logic can be added here if we have local-only updates
  
  console.log(`[${new Date().toISOString()}] Sync cycle complete.`);
}

export function startSyncDaemon() {
  setInterval(runSyncCycle, 30000); // Every 30 seconds
}

const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'data', 'ticket-manager.db');
const API_KEY = process.env.LINEAR_API_KEY || "YOUR_API_KEY";

const db = new Database(DB_PATH);

async function sync() {
    console.log("Seeding local database from external tracker...");
    const query = `query { issues(first: 50, orderBy: updatedAt) { nodes { id identifier title description state { name } updatedAt } } }`;
    
    try {
        const res = await fetch("https://api.linear.app/graphql", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": API_KEY },
            body: JSON.stringify({ query })
        });
        const json = await res.json();
        const issues = json.data?.issues?.nodes || [];

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
        console.log(`Successfully seeded ${issues.length} tickets.`);
    } catch (err) {
        console.error("Sync failed:", err);
    }
}

sync();

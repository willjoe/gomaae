import { db } from './db';

export const BRAINSTORM_CATEGORIES = ['Problem', 'Market', 'Persona', 'UVP', 'Entry', 'Feasibility', 'ROI', 'Other'];

const norm = (s: string) => (s || '').trim().toLowerCase();
const uid = (p: string) => `${p}-${Math.random().toString(36).slice(2, 10)}`;

/**
 * Repair the common LLM JSON string defects: raw control characters inside string
 * literals, and unescaped interior double quotes. A '"' inside a string only counts
 * as the closing quote when the next non-space character is valid JSON structure
 * (, } ] or :) — otherwise it's content and gets escaped.
 */
function escapeControlCharsInStrings(s: string): string {
  let out = '';
  let inStr = false;
  let escaped = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (!inStr) {
      if (ch === '"') inStr = true;
      out += ch;
      continue;
    }
    if (escaped) { out += ch; escaped = false; continue; }
    if (ch === '\\') { out += ch; escaped = true; continue; }
    if (ch === '\n') { out += '\\n'; continue; }
    if (ch === '\r') { out += '\\r'; continue; }
    if (ch === '\t') { out += '\\t'; continue; }
    if (ch === '"') {
      let j = i + 1;
      while (j < s.length && /\s/.test(s[j])) j++;
      const next = s[j];
      if (next === undefined || next === ',' || next === '}' || next === ']' || next === ':') {
        inStr = false;
        out += ch;
      } else {
        out += '\\"';
      }
      continue;
    }
    out += ch;
  }
  return out;
}

/** Pull a JSON object out of a model response that may include prose or code fences. */
export function parseJsonLoose(text: string): any {
  let t = (text || '').replace(/```json/gi, '```').trim();
  const fence = t.match(/```([\s\S]*?)```/);
  if (fence) t = fence[1].trim();
  const start = t.indexOf('{');
  const end = t.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('The model did not return JSON. Try again or pick a stronger model.');
  const raw = t.slice(start, end + 1);
  try {
    return JSON.parse(raw);
  } catch {
    // Repair pass for the two most common LLM JSON defects: raw newlines/tabs
    // inside string literals, and trailing commas before } or ].
    const repaired = escapeControlCharsInStrings(raw).replace(/,\s*([}\]])/g, '$1');
    return JSON.parse(repaired);
  }
}

/** The persisted concept graph (nodes + edges) for the active workstation. */
export function readBrainstormGraph() {
  const nodes = db.prepare('SELECT id, title, category, properties FROM brainstorm_nodes ORDER BY created_at').all() as any[];
  const edges = db.prepare('SELECT id, from_id, to_id, relationship_type FROM brainstorm_edges').all() as any[];
  return { nodes, edges };
}

/** The latest synthesis (summary + draft pillars + delegation) the LLM produced. */
export function readBrainstormSynthesis() {
  const get = (k: string) => (db.prepare('SELECT value FROM project_settings WHERE key = ?').get(k) as any)?.value;
  const summary = get('brainstorm_summary') || '';
  let pillars: Record<string, string> = {};
  let delegation: any = {};
  try { pillars = JSON.parse(get('brainstorm_pillars') || '{}'); } catch { /* ignore */ }
  try { delegation = JSON.parse(get('brainstorm_delegation') || '{}'); } catch { /* ignore */ }
  return { summary, pillars, delegation };
}

/** Merge extracted nodes/edges into the local graph (dedupe nodes by title, edges by from/to/type). */
export function mergeBrainstormGraph(rawNodes: any[], rawEdges: any[]) {
  const existing = db.prepare('SELECT id, title, category FROM brainstorm_nodes').all() as any[];
  const titleToId: Record<string, string> = {};
  for (const n of existing) titleToId[norm(n.title)] = n.id;

  const insNode = db.prepare('INSERT INTO brainstorm_nodes (id, title, category, properties) VALUES (?, ?, ?, ?)');
  const updCat = db.prepare('UPDATE brainstorm_nodes SET category = ? WHERE id = ?');
  for (const n of (rawNodes || [])) {
    const title = String(n?.title || '').trim();
    if (!title) continue;
    const cat = BRAINSTORM_CATEGORIES.includes(n.category) ? n.category : 'Other';
    const key = norm(title);
    if (titleToId[key]) { updCat.run(cat, titleToId[key]); continue; }
    const id = uid('bn');
    insNode.run(id, title, cat, JSON.stringify({ description: n?.description || '' }));
    titleToId[key] = id;
  }

  const existingEdges = db.prepare('SELECT from_id, to_id, relationship_type FROM brainstorm_edges').all() as any[];
  const ekey = (f: string, t: string, r: string) => `${f}|${t}|${norm(r)}`;
  const seen = new Set(existingEdges.map((e) => ekey(e.from_id, e.to_id, e.relationship_type)));
  const insEdge = db.prepare('INSERT INTO brainstorm_edges (id, from_id, to_id, relationship_type) VALUES (?, ?, ?, ?)');
  for (const e of (rawEdges || [])) {
    const f = titleToId[norm(e?.from)];
    const t = titleToId[norm(e?.to)];
    if (!f || !t || f === t) continue;
    const rel = String(e?.relationship_type || 'related');
    const k = ekey(f, t, rel);
    if (seen.has(k)) continue;
    seen.add(k);
    insEdge.run(uid('be'), f, t, rel);
  }
}

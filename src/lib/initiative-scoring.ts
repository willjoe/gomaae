import path from 'path';
import fs from 'fs';
import { db, getActiveProjectRoot } from './db';
import { generateText } from './ai/llm';
import { parseJsonLoose } from './brainstorm';
import { hashContent } from './hash';

const BRIEFS_DIR = path.join('Global', 'Briefs');

/**
 * Maps each brief filename to the pillar key and display title used by the
 * initiative page. Files that contribute to the same scored section list the
 * sibling files under `combine` so their content is merged before scoring.
 */
export const BRIEF_FILE_MAP: Record<string, { pillar: string; title: string; combine?: string[] }> = {
  'Problem Definition.md':                { pillar: 'problem',            title: 'Problem Definition' },
  'Customer & Market.md':                 { pillar: 'market',             title: 'Customer & Market' },
  'Unique Value Proposition.md':          { pillar: 'solution',           title: 'Unique Value Proposition' },
  'Market Entry.md':                      { pillar: 'entry',              title: 'Market Entry' },
  'Feasibility.md':                       { pillar: 'feasibility',        title: 'Feasibility' },
  'Business Value.md':                    { pillar: 'roi',                title: 'Business Value' },
  'Target Persona.md':                    { pillar: 'delegation_persona', title: 'Target Persona & Iconic Scene',                   combine: ['Target Persona.md', 'Iconic Scene.md'] },
  'Iconic Scene.md':                      { pillar: 'delegation_persona', title: 'Target Persona & Iconic Scene',                   combine: ['Target Persona.md', 'Iconic Scene.md'] },
  'MVP Guardrails.md':                    { pillar: 'delegation_mvp',     title: 'Initial Launch Scope & Flexibility (MVP guardrails)' },
  'Success Metric.md':                    { pillar: 'delegation_metrics', title: 'Success Metrics (Quantitative)' },
  'Cultural Fit - Team & Values.md':      { pillar: 'cultural_values',    title: 'Cultural Fit — Team & Values' },
  'Cultural Fit - Organizational Fit.md': { pillar: 'cultural_org',       title: 'Cultural Fit — Organizational Fit' },
};

const SCORE_PROMPT = (title: string, content: string) => `\
You are a Product Management AI Supporter reviewing one pillar of a product strategy.

Pillar: ${title}
Content:
"""
${content}
"""

Rate how well thought-through this pillar is for the product to succeed, on a 0-100 scale:
0 = vague or missing, 50 = a reasonable draft with notable gaps, 100 = rigorous, specific, evidence-based and complete.

Judge ONLY the substance — problem clarity, specificity, supporting evidence, soundness of reasoning, completeness, and awareness of risks/assumptions.
Do NOT rate writing mechanics (grammar, formatting, length) or flag duplicated text — that is an artifact of combined drafts, not a flaw.
Feedback must be about the idea itself (e.g. what evidence, assumptions, or specifics are missing).

Return ONLY a JSON object: { "score": <integer 0-100>, "feedback": "1-3 sentences of specific, substance-focused feedback" }`;

function readBriefContent(root: string, filename: string): string {
  try {
    const p = path.join(root, BRIEFS_DIR, filename);
    if (!fs.existsSync(p)) return '';
    // Strip the markdown H1 header line — page does the same before scoring.
    return fs.readFileSync(p, 'utf8').replace(/^#\s+.*\n/, '').trim();
  } catch {
    return '';
  }
}

/**
 * Score a brief file by name (e.g. "Problem Definition.md").
 * Reads from disk, combines sibling files when needed, skips if the hash
 * hasn't changed since the last stored score.
 * Fire-and-forget safe — never throws.
 */
export async function scoreBriefFile(filename: string): Promise<void> {
  const root = getActiveProjectRoot();
  if (!root) return;

  const mapping = BRIEF_FILE_MAP[filename];
  if (!mapping) return;

  const filenames = mapping.combine ?? [filename];
  const content = filenames
    .map((f) => readBriefContent(root, f))
    .filter(Boolean)
    .join('\n\n');

  if (content.length <= 10) {
    db.prepare('DELETE FROM pillar_scores WHERE pillar = ?').run(mapping.pillar);
    return;
  }

  const hash = hashContent(content);
  const existing = db.prepare('SELECT content_hash FROM pillar_scores WHERE pillar = ?').get(mapping.pillar) as any;
  if (existing?.content_hash === hash) return;

  try {
    const raw = await generateText(SCORE_PROMPT(mapping.title, content));
    const parsed = parseJsonLoose(raw);
    const score = Math.max(0, Math.min(100, Math.round(Number(parsed.score) || 0)));
    const feedback = String(parsed.feedback || '');

    db.prepare(`
      INSERT INTO pillar_scores (pillar, score, feedback, content_hash, updated_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(pillar) DO UPDATE SET
        score = excluded.score,
        feedback = excluded.feedback,
        content_hash = excluded.content_hash,
        updated_at = CURRENT_TIMESTAMP
    `).run(mapping.pillar, score, feedback, hash);
  } catch (e) {
    console.error(`[initiative-scoring] failed to score "${filename}":`, e);
  }
}

/** The relative path prefix that identifies a brief file from the workspace root. */
export const BRIEFS_RELATIVE_PREFIX = 'Global/Briefs/';

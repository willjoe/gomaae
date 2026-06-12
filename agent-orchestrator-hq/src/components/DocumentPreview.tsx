'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { FileText, X, Download } from 'lucide-react';

interface DocumentPreviewProps {
  doc: {
    name: string;
    type?: 'markdown' | 'pdf' | string;
    content?: string;
    url?: string;
  };
  onClose: () => void;
}

const PILLAR_TITLES: Record<string, string> = {
  problem: 'Problem Definition',
  market: 'Market & Persona',
  solution: 'Solution & UVP',
  entry: 'Market Entry',
  feasibility: 'Feasibility',
  roi: 'Business Fit & ROI',
};

// Epic specs are stored as JSON ({ pillars, delegation }) — render them as a
// readable strategy document instead of raw JSON.
function strategyToMarkdown(raw: string): string | null {
  try {
    const d = JSON.parse(raw);
    if (!d || typeof d !== 'object') return null;
    const { pillars, delegation } = d;
    if (!pillars && !delegation) return null;

    let md = '';
    if (pillars) {
      md += '# Strategic Pillars\n';
      for (const [k, v] of Object.entries(pillars)) {
        if (v && String(v).trim()) md += `\n## ${PILLAR_TITLES[k] || k}\n\n${v}\n`;
      }
    }
    if (delegation) {
      md += '\n# Delegation & Guardrails\n';
      if (delegation.persona) md += `\n## Target Persona\n\n${delegation.persona}\n`;
      if (delegation.scene) md += `\n## Iconic Scene\n\n${delegation.scene}\n`;
      if (delegation.mustHave?.length) md += `\n## Must-Have Scope\n\n${delegation.mustHave.map((s: string) => `- ${s}`).join('\n')}\n`;
      if (delegation.niceToHave?.length) md += `\n## Nice-to-Have (Deferred)\n\n${delegation.niceToHave.map((s: string) => `- ${s}`).join('\n')}\n`;
      if (delegation.metricName) md += `\n## Success Metric\n\nWithin **${delegation.metricDays} days**, **${delegation.metricName}** reaches **${delegation.metricTarget}**.\n`;
    }
    return md || null;
  } catch {
    return null;
  }
}

export default function DocumentPreview({ doc, onClose }: DocumentPreviewProps) {
  if (!doc) return null;

  const isPdf = doc.type === 'pdf' && !!doc.url;
  const strategyMd = !isPdf && doc.content ? strategyToMarkdown(doc.content) : null;
  const displayType = isPdf ? 'pdf' : strategyMd ? 'strategy' : doc.type || 'markdown';

  const handleDownload = () => {
    if (isPdf && doc.url) {
      window.open(doc.url, '_blank', 'noreferrer');
      return;
    }
    const blob = new Blob([doc.content || ''], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${doc.name.replace(/[\\/]/g, '_')}${strategyMd ? '.json' : '.md'}`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-2xl flex flex-col h-[600px] animate-in slide-in-from-bottom-4 duration-300 transition-colors duration-300">
      {/* Header */}
      <div className="px-6 py-4 bg-muted/20 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-3 text-foreground font-bold italic tracking-tight">
          <FileText size={18} className="text-blue-500" />
          <span>{doc.name}</span>
          <span className="text-[10px] bg-muted px-2 py-0.5 rounded text-muted-foreground uppercase font-mono">{displayType}</span>
        </div>
        <div className="flex items-center gap-2">
           <button
             onClick={handleDownload}
             title={isPdf ? 'Open PDF in a new tab' : 'Download document'}
             className="p-2 hover:bg-muted rounded-full text-muted-foreground hover:text-foreground transition-colors"
           >
              <Download size={16} />
           </button>
           <button
             onClick={onClose}
             className="p-2 hover:bg-muted rounded-full text-muted-foreground hover:text-foreground transition-colors"
           >
              <X size={20} />
           </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto bg-card p-8 custom-scrollbar">
        {isPdf ? (
          <iframe src={doc.url} title={doc.name} className="w-full h-full rounded-xl border border-border bg-white" />
        ) : (
          <article className="prose dark:prose-invert max-w-none prose-slate prose-headings:italic prose-headings:tracking-tighter">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {strategyMd || doc.content || '# Document Empty'}
            </ReactMarkdown>
          </article>
        )}
      </div>
    </div>
  );
}

'use client';

import React, { useState } from 'react';
import {
  Heart,
  Building2,
  ChevronDown,
  ChevronUp,
  Plus,
  X,
  Trophy,
  Bot,
  Loader2,
  Flame,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { scoreColor } from '@/components/initiative/PillarCard';

// ---------------------------------------------------------------------------
// Data shape
// ---------------------------------------------------------------------------

export interface CulturalFitData {
  /** Why the team genuinely wants to build this. */
  teamEnthusiasm: string;
  /** The organization's core values this initiative upholds (one per entry). */
  coreValues: string[];
  /** Who the internal champion is and why they're committed. */
  internalChampion: string;
  /** How much uncertainty and failure the org is prepared to absorb. */
  riskAppetite: 'low' | 'medium' | 'high' | 'experimental' | '';
  /** How this reinforces or extends the organization's brand and identity. */
  brandFit: string;
}

export const EMPTY_CULTURAL_FIT: CulturalFitData = {
  teamEnthusiasm: '',
  coreValues: [''],
  internalChampion: '',
  riskAppetite: '',
  brandFit: '',
};

type SectionKey = 'values' | 'org';

interface Props {
  data: CulturalFitData;
  onChange: (data: CulturalFitData) => void;
  sectionScores?: Partial<Record<SectionKey, { score: number; feedback: string } | undefined>>;
  sectionScoring?: Partial<Record<SectionKey, boolean>>;
}


// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const RISK_LABELS: Record<string, string> = {
  low: 'Low — predictable outcomes expected',
  medium: 'Medium — moderate pivots acceptable',
  high: 'High — significant failure is on the table',
  experimental: 'Experimental — this is a bet, not a plan',
};

export default function CulturalFit({ data, onChange, sectionScores = {}, sectionScoring = {} }: Props) {
  const [activeSection, setActiveSection] = useState<SectionKey | null>('values');
  const toggle = (s: SectionKey) => setActiveSection(p => p === s ? null : s);

  const updateList = (i: number, val: string) => {
    const next = [...data.coreValues];
    next[i] = val;
    onChange({ ...data, coreValues: next });
  };

  const removeFromList = (i: number) => {
    const next = [...data.coreValues];
    next.splice(i, 1);
    onChange({ ...data, coreValues: next });
  };

  const addToList = () => {
    onChange({ ...data, coreValues: [...data.coreValues, ''] });
  };

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">

      {/* Header */}
      <div className="px-2 pb-2">
        <h2 className="text-xl font-bold tracking-tight text-rose-500 flex items-center gap-2">
          <Heart size={22} />
          Cultural Fit
        </h2>
        <p className="text-xs text-muted-foreground mt-1 italic">
          Define the human and organizational conditions that make this initiative the right thing to build — now, by this team.
        </p>
      </div>

      {/* 1. Team & Values */}
      <ExpandableSection
        title="Team & Values"
        subtitle="Enthusiasm + alignment with what the org stands for"
        icon={<Flame size={18} />}
        isOpen={activeSection === 'values'}
        onToggle={() => toggle('values')}
        isComplete={data.teamEnthusiasm.length > 10 && data.coreValues.some(v => v.trim().length > 2)}
        score={sectionScores.values?.score}
        scoring={!!sectionScoring.values}
        feedback={sectionScores.values?.feedback}
      >
        <div className="space-y-5">
          <div className="bg-rose-500/5 border border-rose-500/10 rounded-2xl p-4 flex gap-3">
            <Bot size={18} className="text-rose-500 shrink-0 mt-0.5" />
            <p className="text-[11px] text-foreground/80 leading-relaxed italic">
              Teams build their best work when they personally care about the problem. Articulate the genuine pull — not just the business case.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-rose-500 px-1">
              Why does the team want to build this?
            </label>
            <textarea
              value={data.teamEnthusiasm}
              onChange={e => onChange({ ...data, teamEnthusiasm: e.target.value })}
              placeholder="e.g. Half the team has personally experienced this frustration, and we've been looking for the right entry point for two years."
              className="w-full h-24 bg-card border border-border rounded-2xl p-4 text-sm focus:ring-2 focus:ring-rose-500/20 outline-none transition-all resize-none shadow-inner font-medium"
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-rose-500">
                Core Values This Initiative Upholds
              </label>
              <button onClick={() => addToList()} className="p-1 hover:bg-rose-500/10 rounded text-rose-500 transition-colors">
                <Plus size={14} />
              </button>
            </div>
            <p className="text-[10px] text-muted-foreground italic px-1">List the organizational values this initiative demonstrates (e.g. "User privacy first", "Accessibility by default")</p>
            <div className="space-y-2">
              {data.coreValues.map((val, i) => (
                <div key={i} className="flex items-center gap-2 group">
                  <input
                    value={val}
                    onChange={e => updateList(i, e.target.value)}
                    placeholder="e.g. Transparency — we publish our model's training data sources"
                    className="flex-1 bg-card border border-border rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-rose-500/30 outline-none font-bold"
                  />
                  {data.coreValues.length > 1 && (
                    <button onClick={() => removeFromList(i)} className="p-1.5 text-muted-foreground hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                      <X size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </ExpandableSection>

      {/* 2. Organizational Fit */}
      <ExpandableSection
        title="Organizational Fit"
        subtitle="Champion, risk appetite, and brand alignment"
        icon={<Building2 size={18} />}
        isOpen={activeSection === 'org'}
        onToggle={() => toggle('org')}
        isComplete={data.internalChampion.length > 10 && data.riskAppetite !== '' && data.brandFit.length > 10}
        score={sectionScores.org?.score}
        scoring={!!sectionScoring.org}
        feedback={sectionScores.org?.feedback}
      >
        <div className="space-y-5">
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-indigo-500 px-1">
              Internal Champion
            </label>
            <textarea
              value={data.internalChampion}
              onChange={e => onChange({ ...data, internalChampion: e.target.value })}
              placeholder="e.g. Head of Product — she's personally pitched this to the board twice and has budget authority for Year 1."
              className="w-full h-20 bg-card border border-border rounded-2xl p-4 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all resize-none shadow-inner font-medium"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-indigo-500 px-1">
              Risk Appetite
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(['low', 'medium', 'high', 'experimental'] as const).map(level => (
                <button
                  key={level}
                  onClick={() => onChange({ ...data, riskAppetite: level })}
                  className={cn(
                    'px-3 py-2.5 rounded-xl border text-left transition-all',
                    data.riskAppetite === level
                      ? 'border-indigo-500/40 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                      : 'border-border bg-muted/20 text-muted-foreground hover:border-indigo-500/20'
                  )}
                >
                  <div className="text-[10px] font-bold uppercase tracking-widest capitalize">{level}</div>
                  <div className="text-[9px] mt-0.5 opacity-70 leading-tight">{RISK_LABELS[level]}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-indigo-500 px-1">
              Brand & Identity Fit
            </label>
            <textarea
              value={data.brandFit}
              onChange={e => onChange({ ...data, brandFit: e.target.value })}
              placeholder="e.g. This extends our 'tools for independent creators' identity. Existing customers would see it as a natural next step — not a distraction."
              className="w-full h-20 bg-card border border-border rounded-2xl p-4 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all resize-none shadow-inner font-medium"
            />
          </div>
        </div>
      </ExpandableSection>

    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared expandable section (same as DelegationReadiness)
// ---------------------------------------------------------------------------

function ExpandableSection({ title, subtitle, icon, isOpen, onToggle, children, isComplete, score, scoring, feedback }: any) {
  return (
    <div className={cn(
      'bg-card border rounded-3xl overflow-hidden transition-all duration-300 shadow-xl',
      isOpen ? 'border-rose-500/30' : 'border-border hover:border-rose-500/20'
    )}>
      <div onClick={onToggle} className="px-6 py-5 flex items-center justify-between cursor-pointer group hover:bg-muted/10 transition-colors">
        <div className="flex items-center gap-4">
          <div className={cn(
            'w-10 h-10 rounded-xl flex items-center justify-center border shadow-inner transition-colors',
            isComplete ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-muted text-muted-foreground border-border'
          )}>
            {isComplete ? <Trophy size={18} /> : icon}
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              {title}
              {isComplete && <span className="text-[10px] bg-green-500/10 text-green-600 px-1.5 py-0.5 rounded-full uppercase border border-green-500/20">Solid</span>}
            </h3>
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-tight">{subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {!isOpen && (scoring || typeof score === 'number') && (
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-bold text-white shadow-md ring-2 ring-card shrink-0"
              style={{ background: scoring ? '#94a3b8' : scoreColor(score) }}
              title={scoring ? 'Scoring…' : `Score: ${score}/100`}
            >
              {scoring ? <Loader2 size={14} className="animate-spin" /> : score}
            </div>
          )}
          {isOpen ? <ChevronUp size={18} className="text-muted-foreground" /> : <ChevronDown size={18} className="text-muted-foreground group-hover:translate-y-0.5 transition-transform" />}
        </div>
      </div>

      {isOpen && (
        <div className="px-6 pb-6 animate-in slide-in-from-top-2 duration-300">
          <div className="border-t border-border/50 pt-6 space-y-5">
            {(scoring || typeof score === 'number') && (
              <div className="rounded-2xl p-3.5 border border-border bg-muted/30 flex items-start gap-3">
                <Bot size={16} className="shrink-0 mt-0.5" style={{ color: scoring ? '#94a3b8' : scoreColor(score, 38) }} />
                <p className="text-xs text-foreground/80 leading-relaxed flex-1">
                  {scoring ? 'The Product Management AI Supporter is reviewing this section…' : (feedback || 'No feedback yet.')}
                </p>
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-bold text-white shadow-md ring-2 ring-card shrink-0 self-start"
                  style={{ background: scoring ? '#94a3b8' : scoreColor(score) }}
                >
                  {scoring ? <Loader2 size={14} className="animate-spin" /> : score}
                </div>
              </div>
            )}
            {children}
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import React, { useState } from 'react';
import { 
  Users, 
  ShieldCheck, 
  Activity, 
  ChevronDown, 
  ChevronUp, 
  Plus, 
  X,
  Target,
  Trophy,
  Bot
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useLifecycle } from '@/context/LifecycleContext';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface DelegationData {
    persona: string;
    mustHave: string[];
    niceToHave: string[];
    metricDays: number;
    metricName: string;
    metricTarget: number;
}

interface DelegationReadinessProps {
    data: DelegationData;
    onChange: (data: DelegationData) => void;
}

export default function DelegationReadiness({ data, onChange }: DelegationReadinessProps) {
    const { t } = useLifecycle();
    const [activeSection, setActiveSection] = useState<'persona' | 'mvp' | 'metrics'>('persona');

    const toggleSection = (section: 'persona' | 'mvp' | 'metrics') => {
        setActiveSection(activeSection === section ? section : section); // Forced expand for now as per "wizard" feel
    };

    const addMustHave = () => {
        onChange({ ...data, mustHave: [...data.mustHave, ''] });
    };

    const addNiceToHave = () => {
        onChange({ ...data, niceToHave: [...data.niceToHave, ''] });
    };

    const updateScope = (type: 'must' | 'nice', index: number, val: string) => {
        const newList = type === 'must' ? [...data.mustHave] : [...data.niceToHave];
        newList[index] = val;
        onChange({ ...data, [type === 'must' ? 'mustHave' : 'niceToHave']: newList });
    };

    const removeScope = (type: 'must' | 'nice', index: number) => {
        const newList = type === 'must' ? [...data.mustHave] : [...data.niceToHave];
        newList.splice(index, 1);
        onChange({ ...data, [type === 'must' ? 'mustHave' : 'niceToHave']: newList });
    };

    return (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
            
            {/* Header */}
            <div className="px-2 pb-2">
                <h2 className="text-xl font-bold tracking-tight text-indigo-500 flex items-center gap-2">
                   <ShieldCheck size={22} />
                   {t('delegation_title')}
                </h2>
                <p className="text-xs text-muted-foreground mt-1 italic">{t('delegation_subtitle')}</p>
            </div>

            {/* 1. Persona Section */}
            <ExpandableSection 
                title={t('persona_label')} 
                subtitle={t('persona_sub')}
                icon={<Users size={18} />}
                isOpen={activeSection === 'persona'}
                onToggle={() => toggleSection('persona')}
                isComplete={data.persona.length > 10}
            >
                <div className="space-y-4">
                    <div className="bg-blue-500/5 border border-blue-500/10 rounded-2xl p-4 flex gap-3">
                        <Bot size={18} className="text-blue-500 shrink-0 mt-0.5" />
                        <p className="text-[11px] text-foreground/80 leading-relaxed italic">
                           Target clarity is the "North Star" for engineers. Focus on a specific user profile and their most symbol usage context.
                        </p>
                    </div>
                    <textarea 
                        value={data.persona}
                        onChange={(e) => onChange({ ...data, persona: e.target.value })}
                        placeholder={t('persona_placeholder')}
                        className="w-full h-32 bg-card border border-border rounded-2xl p-4 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all resize-none shadow-inner font-medium"
                    />
                </div>
            </ExpandableSection>

            {/* 2. MVP Guardrails */}
            <ExpandableSection 
                title={t('mvp_label')} 
                subtitle={t('mvp_sub')}
                icon={<Target size={18} />}
                isOpen={activeSection === 'mvp'}
                onToggle={() => toggleSection('mvp')}
                isComplete={data.mustHave.length > 0 && data.mustHave.every(h => h.length > 2)}
            >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <div className="flex items-center justify-between px-1">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-500">{t('must_have')}</span>
                            <button onClick={addMustHave} className="p-1 hover:bg-indigo-500/10 rounded text-indigo-500 transition-colors"><Plus size={14}/></button>
                        </div>
                        <div className="space-y-2">
                            {data.mustHave.map((val, i) => (
                                <div key={i} className="flex items-center gap-2 group">
                                    <input 
                                        value={val}
                                        onChange={(e) => updateScope('must', i, e.target.value)}
                                        className="flex-1 bg-card border border-border rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-indigo-500/30 outline-none font-bold"
                                        placeholder="e.g. Core API functionality"
                                    />
                                    <button onClick={() => removeScope('must', i)} className="p-1.5 text-muted-foreground hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"><X size={14}/></button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between px-1">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-amber-500">{t('nice_to_have')}</span>
                            <button onClick={addNiceToHave} className="p-1 hover:bg-amber-500/10 rounded text-amber-500 transition-colors"><Plus size={14}/></button>
                        </div>
                        <div className="space-y-2">
                            {data.niceToHave.map((val, i) => (
                                <div key={i} className="flex items-center gap-2 group">
                                    <input 
                                        value={val}
                                        onChange={(e) => updateScope('nice', i, e.target.value)}
                                        className="flex-1 bg-muted/30 border border-border rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-amber-500/30 outline-none italic"
                                        placeholder="e.g. Advanced UI animations"
                                    />
                                    <button onClick={() => removeScope('nice', i)} className="p-1.5 text-muted-foreground hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"><X size={14}/></button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </ExpandableSection>

            {/* 3. Quantitative Metrics */}
            <ExpandableSection 
                title={t('metrics_label')} 
                subtitle={t('metrics_sub')}
                icon={<Activity size={18} />}
                isOpen={activeSection === 'metrics'}
                onToggle={() => toggleSection('metrics')}
                isComplete={data.metricName.length > 2}
            >
                <div className="bg-card border border-border rounded-3xl p-8 flex flex-wrap items-center gap-3 shadow-inner">
                    <span className="text-sm font-bold text-muted-foreground">{t('metrics_prefix')}</span>
                    <input 
                        type="number"
                        value={data.metricDays}
                        onChange={(e) => onChange({ ...data, metricDays: parseInt(e.target.value) || 0 })}
                        className="w-20 bg-muted/50 border border-border rounded-xl px-3 py-2 text-center text-sm font-bold text-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none"
                    />
                    <span className="text-sm font-bold text-muted-foreground">{t('metrics_days')}</span>
                    <input 
                        value={data.metricName}
                        onChange={(e) => onChange({ ...data, metricName: e.target.value })}
                        placeholder={t('metrics_placeholder_name')}
                        className="flex-1 min-w-[200px] bg-muted/50 border border-border rounded-xl px-4 py-2 text-sm font-bold text-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none italic"
                    />
                    <span className="text-sm font-bold text-muted-foreground">{t('metrics_target')}</span>
                    <div className="flex items-center gap-2">
                        <input 
                            type="number"
                            value={data.metricTarget}
                            onChange={(e) => onChange({ ...data, metricTarget: parseInt(e.target.value) || 0 })}
                            className="w-20 bg-muted/50 border border-border rounded-xl px-3 py-2 text-center text-sm font-bold text-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none"
                        />
                        <span className="text-sm font-bold text-muted-foreground">{t('metrics_suffix')}</span>
                    </div>
                </div>
            </ExpandableSection>

        </div>
    );
}

function ExpandableSection({ title, subtitle, icon, isOpen, onToggle, children, isComplete }: any) {
    return (
        <div className={cn(
            "bg-card border rounded-3xl overflow-hidden transition-all duration-300 shadow-xl",
            isOpen ? "border-indigo-500/30" : "border-border hover:border-indigo-500/20"
        )}>
            <div 
                onClick={onToggle}
                className="px-6 py-5 flex items-center justify-between cursor-pointer group hover:bg-muted/10 transition-colors"
            >
                <div className="flex items-center gap-4">
                    <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center border shadow-inner transition-colors",
                        isComplete ? "bg-green-500/10 text-green-500 border-green-500/20" : "bg-muted text-muted-foreground border-border"
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
                {isOpen ? <ChevronUp size={18} className="text-muted-foreground" /> : <ChevronDown size={18} className="text-muted-foreground group-hover:translate-y-0.5 transition-transform" />}
            </div>
            {isOpen && (
                <div className="px-6 pb-6 animate-in slide-in-from-top-2 duration-300">
                    <div className="border-t border-border/50 pt-6">
                        {children}
                    </div>
                </div>
            )}
        </div>
    );
}

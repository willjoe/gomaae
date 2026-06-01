'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  Clock, 
  User, 
  Tag, 
  Calendar, 
  MessageSquare, 
  GitBranch, 
  CheckCircle2,
  FileText,
  Eye,
  ArrowRight,
  ShieldCheck,
  Zap,
  Coins,
  Lock,
  Route,
  Activity,
  UserCheck,
  Bot
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import DocumentPreview from './DocumentPreview';
import { useLifecycle } from '@/context/LifecycleContext';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface TicketDetailViewProps {
  ticket: any;
  onClose: () => void;
}

export default function TicketDetailView({ ticket, onClose }: TicketDetailViewProps) {
  const { t } = useLifecycle();
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  if (!ticket) return null;

  return (
    <div className="bg-slate-950/50 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl animate-in fade-in slide-in-from-right-4 duration-300 font-sans text-left">
      {/* Header */}
      <div className="p-8 border-b border-slate-900 bg-slate-900/30 flex items-start justify-between">
        <div className="space-y-4 max-w-[80%]">
          <div className="flex items-center gap-3">
             <span className={cn(
               "px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest border shadow-lg",
               ticket.tier === 'Epic' ? "bg-amber-900/20 text-amber-500 border-amber-800/30" :
               ticket.tier === 'Story' ? "bg-blue-900/20 text-blue-500 border-blue-800/30" :
               "bg-slate-900 text-slate-400 border-slate-800"
             )}>
               {ticket.identifier}
             </span>
             <span className={cn(
                "px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-tighter",
                ticket.status === 'Done' ? "bg-green-500/10 text-green-500" : "bg-blue-500/10 text-blue-400"
             )}>
                {ticket.status}
             </span>
             {ticket.execution_flag && (
                <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-purple-900/20 border border-purple-800/30 text-purple-400 text-[9px] font-bold uppercase tracking-tighter shadow-sm">
                   <Activity size={10} />
                   {ticket.execution_flag}
                </span>
             )}
          </div>
          <h2 className="text-4xl font-bold tracking-tight text-white leading-tight italic decoration-blue-500/20 underline underline-offset-8">
            {ticket.title}
          </h2>
        </div>
        <button 
          onClick={onClose}
          className="p-3 hover:bg-slate-800 rounded-2xl text-slate-500 hover:text-white transition-all active:scale-90"
        >
          <X size={24} />
        </button>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-3 divide-x divide-slate-900 min-h-[600px]">
        {/* Left Side: Body & High-Integrity Context */}
        <div className="col-span-2 p-8 space-y-12 overflow-y-auto custom-scrollbar h-full">
           
           {/* Document Link Widget */}
           {ticket.document_name && (
             <section className="space-y-4 animate-in slide-in-from-top-2 duration-500">
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                   <FileText size={14} />
                   {t('linked_docs')}
                </h3>
                <div 
                   onClick={() => setIsPreviewOpen(!isPreviewOpen)}
                   className="bg-blue-600/5 border border-blue-500/20 p-5 rounded-2xl flex items-center justify-between group cursor-pointer hover:bg-blue-600/10 transition-all shadow-lg"
                >
                   <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-slate-950 rounded-xl flex items-center justify-center border border-slate-800 text-blue-400 shadow-inner group-hover:scale-105 transition-transform">
                         <FileText size={22} />
                      </div>
                      <div>
                         <div className="font-bold text-slate-100">{ticket.document_name}</div>
                         <div className="text-[10px] text-slate-500 font-mono mt-1 uppercase tracking-tighter">{ticket.document_type} versioning active</div>
                      </div>
                   </div>
                   <div className="flex items-center gap-2 text-[10px] font-bold text-blue-400 uppercase tracking-widest bg-blue-950/30 px-3 py-1.5 rounded-lg border border-blue-800/30 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Eye size={12} />
                      {isPreviewOpen ? 'Hide Preview' : 'Show Preview'}
                   </div>
                </div>

                {isPreviewOpen && (
                  <div className="mt-6 border-t border-slate-800 pt-6">
                    <DocumentPreview 
                       doc={{ 
                         name: ticket.document_name, 
                         type: ticket.document_type, 
                         content: ticket.document_content 
                       }} 
                       onClose={() => setIsPreviewOpen(false)}
                    />
                  </div>
                )}
             </section>
           )}

           <section className="space-y-4 text-left">
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                 <MessageSquare size={14} />
                 {t('requirement_brief')}
              </h3>
              <div className="text-slate-300 leading-relaxed whitespace-pre-wrap font-medium bg-slate-900/30 p-6 rounded-2xl border border-slate-800/50 shadow-inner italic">
                 {ticket.description || 'No detailed documentation provided for this requirement.'}
              </div>
           </section>

           {/* Framework Specific: Security & Scope */}
           {(ticket.resource_scope || ticket.mutation_scope) && (
             <section className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                   <Lock size={14} className="text-red-500/50" />
                   Security & Authorization Scope
                </h3>
                <div className="grid grid-cols-1 gap-4">
                   <div className="bg-slate-950 border border-slate-900 rounded-2xl p-6 space-y-4">
                      <div className="space-y-2">
                         <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest px-1">Resource Read Access (VFS)</div>
                         <div className="flex flex-wrap gap-2">
                            {ticket.resource_scope?.split(',').map((p: string, i: number) => (
                               <span key={i} className="px-2 py-1 bg-slate-900 rounded-lg text-[10px] font-mono text-slate-400 border border-slate-800">{p.trim()}</span>
                            ))}
                         </div>
                      </div>
                      <div className="space-y-2">
                         <div className="text-[9px] font-bold text-amber-500 uppercase tracking-widest px-1">Mutation Authorization (Write)</div>
                         <div className="flex flex-wrap gap-2">
                            {ticket.mutation_scope?.split(',').map((p: string, i: number) => (
                               <span key={i} className="px-2 py-1 bg-amber-950/20 rounded-lg text-[10px] font-mono text-amber-500/70 border border-amber-900/20">{p.trim()}</span>
                            ))}
                         </div>
                      </div>
                   </div>
                </div>
             </section>
           )}

           {/* Dependency Logic */}
           {(ticket.blocked_by || ticket.blocking) && (
             <section className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                   <Route size={14} />
                   Dependency Graph
                </h3>
                <div className="grid grid-cols-2 gap-4">
                   <ContextCard label="Blocked By" value={ticket.blocked_by || 'none'} />
                   <ContextCard label="Blocking" value={ticket.blocking || 'none'} />
                </div>
             </section>
           )}
        </div>

        {/* Right Side: High-Integrity Metadata */}
        <div className="p-8 space-y-8 bg-slate-900/10">
           {/* FinOps Governance */}
           <div className="space-y-6">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-600 border-b border-slate-900 pb-2 flex items-center gap-2">
                 <Coins size={14} className="text-amber-500" />
                 FinOps Governance
              </h4>
              <div className="space-y-6">
                 <div className="space-y-2">
                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-tighter">
                       <span className="text-slate-500">Token Consumption</span>
                       <span className="text-slate-100">{ticket.actual_token_usage || 0} / {ticket.expected_token_usage || 0}</span>
                    </div>
                    <div className="h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800 shadow-inner">
                       <div 
                         className={cn("h-full transition-all duration-1000", (ticket.actual_token_usage / ticket.expected_token_usage) > 0.9 ? "bg-red-500" : "bg-amber-500")}
                         style={{ width: `${Math.min((ticket.actual_token_usage / ticket.expected_token_usage) * 100, 100)}%` }} 
                       />
                    </div>
                 </div>
              </div>
           </div>

           {/* AI Agent Specifications */}
           <div className="space-y-6 pt-4">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-600 border-b border-slate-900 pb-2 flex items-center gap-2">
                 <Zap size={14} className="text-blue-500" />
                 Agent Specification
              </h4>
              <div className="space-y-4">
                 <MetaItem icon={<UserCheck size={14} />} label="Assigned Role" value={ticket.llm_role || 'Generalist'} />
                 <MetaItem icon={<Bot size={14} />} label="Mandated Model" value={ticket.authorized_model || 'System Default'} />
                 <MetaItem icon={<ShieldCheck size={14} />} label="Personality Vector" value={ticket.personality_vector || 'none'} />
              </div>
           </div>

           {/* Temporal Context */}
           <div className="space-y-6 pt-4">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-600 border-b border-slate-900 pb-2">Temporal Context</h4>
              <div className="space-y-4">
                 <MetaItem icon={<Clock size={14} />} label="TTL Deadline" value={ticket.ttl ? new Date(ticket.ttl).toLocaleString() : 'Permanent'} />
                 <MetaItem icon={<Calendar size={14} />} label="Updated" value={new Date(ticket.updated_at).toLocaleDateString()} />
              </div>
           </div>

           <div className="pt-8 border-t border-slate-900">
              <div className="p-4 bg-amber-600/5 border border-amber-500/10 rounded-2xl space-y-2">
                 <h5 className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">{t('locked_stage')}</h5>
                 <p className="text-[9px] text-slate-500 leading-relaxed italic">
                    {t('locked_desc')}
                 </p>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}

function ContextCard({ label, value, mono = false }: { label: string, value: string, mono?: boolean }) {
  return (
    <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl space-y-1 shadow-sm font-sans">
      <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{label}</div>
      <div className={cn("text-xs font-semibold text-slate-300 truncate", mono && "font-mono text-[10px]")}>
        {value}
      </div>
    </div>
  );
}

function MetaItem({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) {
  return (
    <div className="flex items-center gap-3 font-sans text-left">
       <div className="text-slate-600">{icon}</div>
       <div className="overflow-hidden">
          <div className="text-[9px] font-bold text-slate-700 uppercase tracking-tighter leading-none">{label}</div>
          <div className="text-[11px] font-bold text-slate-400 mt-0.5 truncate">{value}</div>
       </div>
    </div>
  );
}

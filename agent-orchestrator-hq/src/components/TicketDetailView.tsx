'use client';

import React, { useState, useMemo } from 'react';
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
  Bot,
  Plus,
  FolderTree,
  Database,
  Code2,
  TableProperties,
  ChevronRight
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import DocumentPreview from './DocumentPreview';
import { useLifecycle } from '@/context/LifecycleContext';
import { Ticket } from './gantt/types';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface TicketDetailViewProps {
  ticket: Ticket;
  phaseId: string;
  onClose: () => void;
}

export default function TicketDetailView({ ticket, phaseId, onClose }: TicketDetailViewProps) {
  const { t, tickets: allTickets, setPhaseSelectedTicket } = useLifecycle();
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [showRawData, setShowRawData] = useState(false);

  const childTickets = useMemo(() => {
    return allTickets.filter(t => t.parent_id === ticket.id);
  }, [allTickets, ticket.id]);

  const parentTicket = useMemo(() => {
    if (!ticket.parent_id) return null;
    return allTickets.find(t => t.id === ticket.parent_id);
  }, [allTickets, ticket.parent_id]);

  if (!ticket) return null;

  // Determine if editable based on phase and tier
  const isReadOnly = 
    (phaseId === 'planning' && ticket.tier === 'Epic') ||
    (phaseId === 'development' && ticket.tier === 'Story') ||
    (phaseId === 'testing' && ticket.tier === 'Story') ||
    (phaseId === 'release' && ticket.tier === 'Story');

  const canAddChild = 
    (phaseId === 'planning' && ticket.tier === 'Epic') ||
    (phaseId === 'development' && ticket.tier === 'Story') ||
    (phaseId === 'testing' && ticket.tier === 'Story') ||
    (phaseId === 'release' && ticket.tier === 'Story');

  const childLabel = 
    phaseId === 'planning' ? 'Story' : 
    phaseId === 'development' ? 'Task' : 
    phaseId === 'testing' ? 'QA' : 'Child';

  // For Raw Data View - everything in the object
  const rawEntries = Object.entries(ticket).sort(([a], [b]) => a.localeCompare(b));

  return (
    <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-2xl animate-in fade-in slide-in-from-right-4 duration-300 font-sans text-left transition-colors duration-300">
      {/* Header */}
      <div className="p-8 border-b border-border bg-muted/30 flex items-start justify-between">
        <div className="space-y-4 max-w-[80%]">
          <div className="flex items-center gap-3">
             <span className={cn(
               "px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest border shadow-lg transition-colors",
               ticket.tier === 'Epic' ? "bg-amber-500/10 text-amber-600 dark:text-amber-500 border-amber-500/30" :
               ticket.tier === 'Story' ? "bg-blue-500/10 text-blue-600 dark:text-blue-500 border-blue-500/30" :
               "bg-muted text-muted-foreground border-border"
             )}>
               {ticket.identifier}
             </span>
             {isReadOnly && (
                <span className="px-2 py-0.5 rounded-full bg-slate-500/10 text-slate-500 text-[9px] font-bold uppercase tracking-tighter border border-slate-500/20">
                   Input Asset (Read-Only)
                </span>
             )}
             <span className={cn(
                "px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-tighter transition-colors",
                ticket.status === 'Done' ? "bg-green-500/10 text-green-600" : "bg-blue-500/10 text-blue-600 dark:text-blue-400"
             )}>
                {ticket.status}
             </span>
          </div>
          <h2 className="text-4xl font-bold tracking-tight text-foreground leading-tight italic decoration-blue-500/20 underline underline-offset-8">
            {ticket.title}
          </h2>
          <div className="flex items-center gap-2">
            {canAddChild && (
                <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg active:scale-95">
                    <Plus size={14} />
                    Generate {childLabel}
                </button>
            )}
            <button 
                onClick={() => setShowRawData(!showRawData)}
                className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border",
                    showRawData ? "bg-purple-600 text-white border-purple-400 shadow-lg" : "bg-muted text-muted-foreground border-border hover:bg-muted/80"
                )}
            >
                <TableProperties size={14} />
                {showRawData ? 'Hide Raw Data' : 'Inspect Columns'}
            </button>
          </div>
        </div>
        <button 
          onClick={onClose}
          className="p-3 hover:bg-muted rounded-2xl text-muted-foreground hover:text-foreground transition-all active:scale-90"
        >
          <X size={24} />
        </button>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-border min-h-[600px]">
        {/* Left Side: Body & High-Integrity Context */}
        <div className="lg:col-span-2 p-8 space-y-12 overflow-y-auto custom-scrollbar h-[800px]">
           
           {showRawData ? (
             <section className="space-y-4 animate-in fade-in duration-300">
                <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                   <Database size={14} className="text-purple-500" />
                   Raw Registry Column Audit
                </h3>
                <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-inner font-mono text-[10px]">
                   <table className="w-full text-left border-collapse">
                      <thead>
                         <tr className="bg-muted/50 text-muted-foreground uppercase tracking-widest">
                            <th className="px-4 py-3 border-b border-border">Column Key</th>
                            <th className="px-4 py-3 border-b border-border">Stored Value</th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-border/30">
                         {rawEntries.map(([key, val]) => (
                            <tr key={key} className="hover:bg-muted/20 transition-colors">
                               <td className="px-4 py-2 text-foreground font-bold opacity-70">{key}</td>
                               <td className="px-4 py-2 text-foreground break-all">{val === null ? <span className="text-muted-foreground italic opacity-50">NULL</span> : String(val)}</td>
                            </tr>
                         ))}
                      </tbody>
                   </table>
                </div>
             </section>
           ) : (
             <>
               {/* Document Link Widget */}
               {ticket.document_name && (
                 <section className="space-y-4 animate-in slide-in-from-top-2 duration-500">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                       <FileText size={14} />
                       {isReadOnly ? 'Associated Intelligence' : t('linked_docs')}
                    </h3>
                    <div 
                       onClick={() => setIsPreviewOpen(!isPreviewOpen)}
                       className="bg-blue-600/5 border border-blue-500/20 p-5 rounded-2xl flex items-center justify-between group cursor-pointer hover:bg-blue-600/10 transition-all shadow-lg"
                    >
                       <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-card rounded-xl flex items-center justify-center border border-border text-blue-500 shadow-inner group-hover:scale-105 transition-transform">
                             <FileText size={22} />
                          </div>
                          <div>
                             <div className="font-bold text-foreground">{ticket.document_name}</div>
                             <div className="text-[10px] text-muted-foreground font-mono mt-1 uppercase tracking-tighter">{ticket.document_type} versioning active</div>
                          </div>
                       </div>
                       <div className="flex items-center gap-2 text-[10px] font-bold text-blue-500 uppercase tracking-widest bg-blue-500/10 px-3 py-1.5 rounded-lg border border-blue-500/20 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Eye size={12} />
                          {isPreviewOpen ? 'Hide Preview' : 'Show Preview'}
                       </div>
                    </div>

                    {isPreviewOpen && (
                      <div className="mt-6 border-t border-border pt-6">
                        <DocumentPreview 
                           doc={{ 
                             name: ticket.document_name!, 
                             type: ticket.document_type as any, 
                             content: ticket.document_content! 
                           }} 
                           onClose={() => setIsPreviewOpen(false)}
                        />
                      </div>
                    )}
                 </section>
               )}

               {/* Hierarchy Section */}
               {(parentTicket || childTickets.length > 0) && (
                 <section className="space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                       <FolderTree size={14} />
                       Node Hierarchy Traceability
                    </h3>
                    <div className="grid grid-cols-1 gap-4">
                       {parentTicket && (
                         <div className="space-y-2">
                            <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest px-1">Parent Node</div>
                            <div 
                              onClick={() => setPhaseSelectedTicket(phaseId, parentTicket.id)}
                              className="p-4 bg-muted/30 border border-border rounded-xl flex items-center justify-between group cursor-pointer hover:bg-blue-600/5 transition-all shadow-sm"
                            >
                               <div className="flex items-center gap-3">
                                  <span className="text-[10px] font-bold bg-muted px-2 py-0.5 rounded border border-border">{parentTicket.identifier}</span>
                                  <span className="text-sm font-semibold text-foreground/80 group-hover:text-foreground">{parentTicket.title}</span>
                               </div>
                               <ArrowRight size={14} className="text-muted-foreground group-hover:text-blue-500" />
                            </div>
                         </div>
                       )}

                       {childTickets.length > 0 && (
                         <div className="space-y-2">
                            <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest px-1">Nested Child Nodes ({childTickets.length})</div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                               {childTickets.map(ct => (
                                 <div 
                                    key={ct.id}
                                    onClick={() => setPhaseSelectedTicket(phaseId, ct.id)}
                                    className="p-3 bg-card border border-border rounded-xl flex items-center justify-between group cursor-pointer hover:border-blue-500/30 transition-all shadow-sm"
                                 >
                                    <div className="flex flex-col overflow-hidden">
                                       <span className="text-[8px] font-bold text-muted-foreground uppercase">{ct.identifier}</span>
                                       <span className="text-xs font-bold text-foreground/80 group-hover:text-foreground truncate">{ct.title}</span>
                                    </div>
                                    <ChevronRight size={14} className="text-muted-foreground group-hover:text-blue-500 shrink-0" />
                                 </div>
                               ))}
                            </div>
                         </div>
                       )}
                    </div>
                 </section>
               )}

               <section className="space-y-4 text-left">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                     <MessageSquare size={14} />
                     {isReadOnly ? 'Contextual Brief' : t('requirement_brief')}
                  </h3>
                  <div className="text-foreground leading-relaxed whitespace-pre-wrap font-medium bg-muted/30 p-6 rounded-2xl border border-border shadow-inner italic">
                     {ticket.description || 'No detailed documentation provided.'}
                  </div>
               </section>

               {/* Framework Specific: Security & Scope */}
               {!isReadOnly && (ticket.resource_scope || ticket.mutation_scope) && (
                 <section className="space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                       <Lock size={14} className="text-red-500/50" />
                       Security & Authorization Scope
                    </h3>
                    <div className="grid grid-cols-1 gap-4">
                       <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
                          <div className="space-y-2">
                             <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest px-1">Resource Read Access (VFS)</div>
                             <div className="flex flex-wrap gap-2">
                                {ticket.resource_scope?.split(',').map((p: string, i: number) => (
                                   <span key={i} className="px-2 py-1 bg-muted rounded-lg text-[10px] font-mono text-muted-foreground border border-border">{p.trim()}</span>
                                ))}
                             </div>
                          </div>
                          <div className="space-y-2">
                             <div className="text-[9px] font-bold text-amber-600 dark:text-amber-500 uppercase tracking-widest px-1">Mutation Authorization (Write)</div>
                             <div className="flex flex-wrap gap-2">
                                {ticket.mutation_scope?.split(',').map((p: string, i: number) => (
                                   <span key={i} className="px-2 py-1 bg-amber-500/10 rounded-lg text-[10px] font-mono text-amber-600 dark:text-amber-500 border border-amber-500/20">{p.trim()}</span>
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
                    <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                       <Route size={14} />
                       Critical Path & Dependencies
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                       <div className={cn("p-4 rounded-xl border flex flex-col gap-1 transition-all", ticket.blocked_by ? "bg-red-500/5 border-red-500/20" : "bg-muted/30 border-border")}>
                          <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Blocked By</span>
                          <div className="text-xs font-bold flex items-center gap-2">
                             {ticket.blocked_by ? (
                                <>
                                   <Lock size={12} className="text-red-500" />
                                   <span className="text-red-600 dark:text-red-400">{ticket.blocked_by}</span>
                                </>
                             ) : (
                                <span className="text-muted-foreground italic font-normal">No blockers identified</span>
                             )}
                          </div>
                       </div>
                       <div className={cn("p-4 rounded-xl border flex flex-col gap-1 transition-all", ticket.blocking ? "bg-blue-500/5 border-blue-500/20" : "bg-muted/30 border-border")}>
                          <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Blocking Execution Of</span>
                          <div className="text-xs font-bold flex items-center gap-2">
                             {ticket.blocking ? (
                                <>
                                   <ArrowRight size={12} className="text-blue-500" />
                                   <span className="text-blue-600 dark:text-blue-400">{ticket.blocking}</span>
                                </>
                             ) : (
                                <span className="text-muted-foreground italic font-normal">Not currently blocking downstream tasks</span>
                             )}
                          </div>
                       </div>
                    </div>
                 </section>
               )}
             </>
           )}
        </div>

        {/* Right Side: High-Integrity Metadata */}
        <div className="p-8 space-y-8 bg-muted/20">
           {/* FinOps Governance */}
           {!isReadOnly && (
             <div className="space-y-6">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground border-b border-border pb-2 flex items-center gap-2">
                   <Coins size={14} className="text-amber-500" />
                   FinOps Governance
                </h4>
                <div className="space-y-6">
                   <div className="space-y-2">
                      <div className="flex justify-between text-[10px] font-bold uppercase tracking-tighter">
                         <span className="text-muted-foreground">Token Consumption</span>
                         <span className="text-foreground">{ticket.actual_token_usage || 0} / {ticket.expected_token_usage || 0}</span>
                      </div>
                      <div className="h-1.5 bg-card rounded-full overflow-hidden border border-border shadow-inner">
                         <div 
                           className={cn("h-full transition-all duration-1000", (Number(ticket.actual_token_usage || 0) / Number(ticket.expected_token_usage || 1)) > 0.9 ? "bg-red-500" : "bg-amber-500")}
                           style={{ width: `${Math.min((Number(ticket.actual_token_usage || 0) / Number(ticket.expected_token_usage || 1)) * 100, 100)}%` }} 
                         />
                      </div>
                   </div>
                </div>
             </div>
           )}

           {/* AI Agent Specifications */}
           {!isReadOnly && (
             <div className="space-y-6 pt-4">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground border-b border-border pb-2 flex items-center gap-2">
                   <Zap size={14} className="text-blue-500" />
                   Agent Specification
                </h4>
                <div className="space-y-4">
                   <MetaItem icon={<UserCheck size={14} />} label="Assigned Role" value={ticket.llm_role || 'Generalist'} />
                   <MetaItem icon={<Bot size={14} />} label="Mandated Model" value={ticket.authorized_model || 'System Default'} />
                   <MetaItem icon={<ShieldCheck size={14} />} label="Personality Vector" value={ticket.personality_vector || 'none'} />
                </div>
             </div>
           )}

           {/* Temporal Context */}
           <div className="space-y-6 pt-4">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground border-b border-border pb-2 flex items-center gap-2">
                 <Calendar size={14} className="text-emerald-500" />
                 Temporal Context
              </h4>
              <div className="space-y-4">
                 <MetaItem icon={<Clock size={14} />} label="Earliest Start" value={new Date(ticket.start_date).toLocaleDateString()} />
                 <MetaItem icon={<CheckCircle2 size={14} />} label="Target Delivery" value={new Date(ticket.due_date).toLocaleDateString()} />
                 <MetaItem icon={<Activity size={14} />} label="TTL Deadline" value={ticket.ttl ? new Date(ticket.ttl).toLocaleString() : 'Permanent'} />
                 <MetaItem icon={<RotateCcw size={14} className="text-muted-foreground" />} label="Last Registry Sync" value={new Date(ticket.updated_at).toLocaleString()} />
              </div>
           </div>

           <div className="pt-8 border-t border-border">
              <div className={cn("p-4 rounded-2xl space-y-2 border", isReadOnly ? "bg-blue-500/5 border-blue-500/10" : "bg-amber-600/5 border-amber-500/10")}>
                 <h5 className={cn("text-[10px] font-bold uppercase tracking-widest", isReadOnly ? "text-blue-500" : "text-amber-500")}>
                    {isReadOnly ? 'Upstream Requirement' : t('locked_stage')}
                 </h5>
                 <p className="text-[9px] text-muted-foreground leading-relaxed italic">
                    {isReadOnly ? 'This asset is a finalized output from a previous stage and is used here as a technical constraint.' : t('locked_desc')}
                 </p>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}

function RotateCcw({ size, className }: { size: number, className?: string }) {
    return (
        <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width={size} 
            height={size} 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            className={className}
        >
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>
        </svg>
    )
}

function MetaItem({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) {
  return (
    <div className="flex items-center gap-3 font-sans text-left transition-colors duration-300">
       <div className="text-muted-foreground/60">{icon}</div>
       <div className="overflow-hidden">
          <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-tighter leading-none">{label}</div>
          <div className="text-[11px] font-bold text-foreground mt-0.5 truncate">{value}</div>
       </div>
    </div>
  );
}

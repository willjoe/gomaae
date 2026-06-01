'use client';

import React from 'react';
import { FlaskConical, Activity, CheckCircle2, ShieldCheck, ArrowRight, Plus } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import LifecyclePageLayout from '@/components/LifecyclePageLayout';
import HierarchicalRoadmapGantt from '@/components/HierarchicalRoadmapGantt';
import { useLifecycle } from '@/context/LifecycleContext';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function TestingPage() {
  const { tickets, loading, setPhaseSelectedTicket, t, phaseStates } = useLifecycle();
  
  const filteredIds = phaseStates['testing']?.filteredTicketIds;
  
  // In testing phase, we show EVERYTHING. 
  // Epics are parents, and all of their descendants (Stories, Tasks, QA) are shown.
  const epics = tickets.filter((tk: any) => tk.tier === 'Epic');
  
  // Children for the hierarchical view in testing are all non-epic tickets
  const children = tickets.filter((tk: any) => tk.tier !== 'Epic');

  const qaTicketsOnly = tickets.filter((tk: any) => tk.tier === 'QA' && (!filteredIds || filteredIds.includes(tk.id)));
  const inReviewCount = qaTicketsOnly.filter(tk => tk.status === 'In Review').length;

  const dashboardContent = (
    <div className="space-y-12 font-sans">
      {/* Universal Verification Waterfall (No Expansion) */}
      <HierarchicalRoadmapGantt 
        parents={epics} 
        children={children} 
        onSelectTicket={(ticket) => setPhaseSelectedTicket('testing', ticket.id)}
        parentLabel="Project"
        childLabel="Artifacts"
        scale="days"
        readOnlyParent={true}
        isTestingPhase={true}
        disableExpansion={true}
      />

      {/* Quality Control Dashboard */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-left-4 duration-300">
        <StatCard 
          icon={<Activity size={20} />} 
          label={t('review')} 
          value={`${inReviewCount} Items`}
          desc="Verification Pending"
          color="pink"
        />
        <StatCard 
          icon={<FlaskConical size={20} />} 
          label={t('qa_cycle')} 
          value={`${qaTicketsOnly.length} Test Assets`}
          desc="100% Structural Coverage"
          color="purple"
        />
        <StatCard 
          icon={<CheckCircle2 size={20} />} 
          label="Traceability" 
          value="Synchronized"
          desc="Every node verified"
          color="green"
        />
      </section>

      {/* Verification Queue (QA Only) */}
      <div className="bg-card rounded-3xl border border-border overflow-hidden shadow-2xl transition-colors duration-300">
        <div className="px-6 py-4 bg-muted/50 border-b border-border flex justify-between items-center">
            <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2 font-mono">
              <ShieldCheck size={14} />
              {t('verification_queue')}
            </h2>
        </div>
        <div className="divide-y divide-border/50">
            {loading ? (
              <div className="text-center py-12 text-muted-foreground italic text-xs font-mono animate-pulse tracking-widest uppercase">Building test registry...</div>
            ) : qaTicketsOnly.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground italic uppercase text-[10px] tracking-widest font-bold opacity-50">No active test assets found.</div>
            ) : qaTicketsOnly.map(tk => (
              <div 
                key={tk.id} 
                onClick={() => setPhaseSelectedTicket('testing', tk.id)}
                className="p-5 flex items-center justify-between hover:bg-muted/50 transition-colors group cursor-pointer"
              >
                  <div className="flex items-center space-x-5 text-left">
                    <div className="w-12 h-12 bg-pink-500/10 rounded-xl flex items-center justify-center text-pink-500 border border-pink-500/20 group-hover:scale-105 transition-transform shadow-inner">
                      <FlaskConical size={24} />
                    </div>
                    <div>
                      <div className="font-bold text-lg text-foreground tracking-tight">{tk.title}</div>
                      <div className="flex items-center gap-3 text-[10px] text-muted-foreground font-mono mt-1.5 uppercase tracking-tighter font-bold opacity-80">
                         <span className="bg-muted px-1.5 py-0.5 rounded border border-border">{tk.identifier}</span>
                         <span className="flex items-center gap-1">
                            <div className={cn("w-1.5 h-1.5 rounded-full", tk.status === 'Done' ? "bg-green-500" : "bg-pink-500 animate-pulse")} />
                            {tk.status}
                         </span>
                         <span className="text-pink-500/80 font-bold uppercase italic">{tk.linked_ticket_id ? `Verify ${tk.linked_ticket_id}` : 'General Test'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <button className="text-[10px] font-bold uppercase px-4 py-2 bg-pink-600 text-white rounded-xl hover:bg-pink-500 transition-all shadow-lg active:scale-95">
                      {t('approve_release')}
                    </button>
                    <ArrowRight size={20} className="text-muted-foreground/30 group-hover:text-pink-500 transition-colors" />
                  </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );

  return (
    <LifecyclePageLayout
      phaseId="testing"
      tier="QA"
      title={t('testing')}
      description={t('testing_desc')}
      buttonLabel={t('new_qa')}
      dashboardContent={dashboardContent}
    />
  );
}

function StatCard({ icon, label, value, desc, color }: { icon: any, label: string, value: string, desc: string, color: 'pink'|'purple'|'green' }) {
   const colors = {
      pink: "text-pink-500 border-pink-500/20",
      purple: "text-purple-500 border-purple-500/20",
      green: "text-green-500 border-green-500/20"
   };
   return (
      <div className={cn("bg-card border border-border rounded-3xl p-6 space-y-4 shadow-xl border-l-4", colors[color])}>
         <div className="flex items-center justify-between opacity-80">
            {icon}
            <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 bg-muted rounded border border-border font-mono">{label}</span>
         </div>
         <div>
            <div className="text-3xl font-bold text-foreground tracking-tighter italic">{value}</div>
            <p className="text-muted-foreground text-[10px] mt-1 uppercase font-bold tracking-tighter">{desc}</p>
         </div>
      </div>
   );
}

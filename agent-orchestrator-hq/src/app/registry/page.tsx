'use client';

import React, { useState } from 'react';
import { 
  Search, 
  ChevronRight, 
  ArrowRight
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/cn';
import { getPhaseForTier, getRouteForPhase, getTierBadgeClasses } from '@/lib/phaseConfig';
import { useLifecycle } from '@/context/LifecycleContext';
import SystemViewerLayout from '@/components/SystemViewerLayout';


export default function TrackerRegistry() {
  const { tickets, loading, setPhaseSelectedTicket, t } = useLifecycle();
  const [search, setSearch] = useState('');
  const router = useRouter();

  const filtered = tickets.filter(tk => 
    tk.title.toLowerCase().includes(search.toLowerCase()) || 
    tk.identifier.toLowerCase().includes(search.toLowerCase())
  );

  const handleNavigateToTicket = (ticket: any) => {
    const phaseId = getPhaseForTier(ticket.tier);
    setPhaseSelectedTicket(phaseId, ticket.id);
    router.push(getRouteForPhase(phaseId));
  };

  const sidebarContent = (
    <div className="bg-purple-600/5 border border-purple-500/10 rounded-2xl p-5 space-y-3 opacity-60">
       <h3 className="text-[10px] font-bold uppercase tracking-widest text-purple-500 dark:text-purple-400">Database Sync</h3>
       <p className="text-[10px] text-muted-foreground leading-relaxed italic text-left">
          Bi-directional synchronization ensures local state matches your external tracker.
       </p>
    </div>
  );

  return (
    <SystemViewerLayout
      id="registry"
      title={t('tracker')}
      description={t('tracker_desc')}
      wizardType="tracker"
      sidebarContent={sidebarContent}
    >
      <div className="space-y-6">
         <div className="flex items-center gap-4">
            <div className="relative flex-1">
               <Search className="absolute left-3 top-2.5 text-muted-foreground" size={16} />
               <input 
                  type="text" 
                  placeholder={t('search_placeholder')}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-card border border-border rounded-2xl pl-10 pr-4 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-purple-500/20 transition-all font-medium italic"
               />
            </div>
         </div>

         <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-2xl">
            <table className="w-full text-left border-collapse text-sm">
               <thead>
                  <tr className="bg-muted/50 border-b border-border">
                     <th className="px-6 py-4 font-bold text-muted-foreground uppercase tracking-widest text-[10px]">Identifier</th>
                     <th className="px-6 py-4 font-bold text-muted-foreground uppercase tracking-widest text-[10px]">Tier</th>
                     <th className="px-6 py-4 font-bold text-muted-foreground uppercase tracking-widest text-[10px]">Title</th>
                     <th className="px-6 py-4"></th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-border/50">
                  {filtered.map(tk => (
                     <tr 
                       key={tk.id} 
                       onClick={() => handleNavigateToTicket(tk)}
                       className="hover:bg-purple-600/5 dark:hover:bg-purple-600/10 transition-colors group cursor-pointer"
                     >
                        <td className="px-6 py-4">
                           <span className={cn(
                              "text-[10px] font-bold px-2 py-0.5 rounded-lg border font-mono tracking-tighter",
                              getTierBadgeClasses(tk.tier)
                           )}>
                              {tk.identifier}
                           </span>
                        </td>
                        <td className="px-6 py-4">
                           <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter italic opacity-70">{tk.tier}</span>
                        </td>
                        <td className="px-6 py-4 font-medium text-foreground group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">{tk.title}</td>
                        <td className="px-6 py-4 text-right">
                           <div className="flex items-center justify-end gap-2 text-[10px] font-bold text-purple-600 dark:text-purple-400 opacity-0 group-hover:opacity-100 transition-all uppercase tracking-widest text-right">
                              <span>Go to Lifecycle</span>
                              <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform shrink-0" />
                           </div>
                        </td>
                     </tr>
                  ))}
               </tbody>
            </table>
         </div>
      </div>
    </SystemViewerLayout>
  );
}

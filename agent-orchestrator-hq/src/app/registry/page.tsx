'use client';

import React, { useState } from 'react';
import { 
  Search, 
  ChevronRight, 
  ArrowRight
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useLifecycle } from '@/context/LifecycleContext';
import SystemViewerLayout from '@/components/SystemViewerLayout';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function TrackerRegistry() {
  const { tickets, loading, setPhaseSelectedTicket, t } = useLifecycle();
  const [search, setSearch] = useState('');
  const router = useRouter();

  const filtered = tickets.filter(tk => 
    tk.title.toLowerCase().includes(search.toLowerCase()) || 
    tk.identifier.toLowerCase().includes(search.toLowerCase())
  );

  const handleNavigateToTicket = (ticket: any) => {
    let phaseId = 'planning';
    if (ticket.tier === 'Epic') phaseId = 'initiative';
    if (ticket.tier === 'Task') phaseId = 'development';
    if (ticket.tier === 'QA') phaseId = 'testing';
    if (ticket.tier === 'Triage') phaseId = 'release';

    setPhaseSelectedTicket(phaseId, ticket.id);
    const route = phaseId === 'planning' ? '/' : `/${phaseId}`;
    router.push(route);
  };

  const sidebarContent = (
    <div className="bg-purple-600/5 border border-purple-500/10 rounded-2xl p-5 space-y-3 opacity-60">
       <h3 className="text-[10px] font-bold uppercase tracking-widest text-purple-400">Database Sync</h3>
       <p className="text-[10px] text-slate-500 leading-relaxed italic text-left">
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
               <Search className="absolute left-3 top-2.5 text-slate-500" size={16} />
               <input 
                  type="text" 
                  placeholder={t('search_placeholder')}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-2xl pl-10 pr-4 py-2.5 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-purple-500/20 transition-all font-medium italic"
               />
            </div>
         </div>

         <div className="bg-slate-950 border border-slate-900 rounded-3xl overflow-hidden shadow-2xl">
            <table className="w-full text-left border-collapse text-sm">
               <thead>
                  <tr className="bg-slate-900/50 border-b border-slate-900">
                     <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-widest text-[10px]">Identifier</th>
                     <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-widest text-[10px]">Tier</th>
                     <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-widest text-[10px]">Title</th>
                     <th className="px-6 py-4"></th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-900/50">
                  {filtered.map(tk => (
                     <tr 
                       key={tk.id} 
                       onClick={() => handleNavigateToTicket(tk)}
                       className="hover:bg-purple-600/5 transition-colors group cursor-pointer"
                     >
                        <td className="px-6 py-4">
                           <span className={cn(
                              "text-[10px] font-bold px-2 py-0.5 rounded-lg border font-mono tracking-tighter",
                              tk.tier === 'Epic' ? "bg-amber-900/20 text-amber-500 border-amber-800/30" :
                              tk.tier === 'Story' ? "bg-blue-900/20 text-blue-500 border-blue-800/30" :
                              "bg-slate-900 text-slate-400 border-slate-800"
                           )}>
                              {tk.identifier}
                           </span>
                        </td>
                        <td className="px-6 py-4">
                           <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter italic opacity-70">{tk.tier}</span>
                        </td>
                        <td className="px-6 py-4 font-medium text-slate-200 group-hover:text-purple-400 transition-colors">{tk.title}</td>
                        <td className="px-6 py-4 text-right">
                           <div className="flex items-center justify-end gap-2 text-[10px] font-bold text-purple-400 opacity-0 group-hover:opacity-100 transition-all uppercase tracking-widest text-right">
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

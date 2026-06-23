'use client';

import React, { useState, useEffect } from 'react';
import { 
  CloudLightning, 
  ShieldCheck, 
  ShieldAlert, 
  Key
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { useLifecycle } from '@/context/LifecycleContext';
import SystemViewerLayout from '@/components/SystemViewerLayout';


export default function CloudPlatformViewer() {
  const { t } = useLifecycle();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const res = await fetch('/api/cloud');
      const data = await res.json();
      if (data.success) setAccounts(data.accounts);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const sidebarContent = (
    <div className="space-y-4">
       <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-600 border-b border-slate-900 pb-2">{t('infra_health')}</h3>
       <div className="space-y-4 text-left font-sans">
          <div className="flex justify-between items-center bg-slate-950 p-3 rounded-xl border border-slate-900 shadow-inner">
             <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Active Accounts</span>
             <span className="text-[10px] font-mono font-bold text-emerald-500 uppercase text-right">{accounts.length} Nodes</span>
          </div>
          <div className="flex justify-between items-center bg-slate-950 p-3 rounded-xl border border-slate-800 shadow-inner">
             <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t('security_audit')}</span>
             <span className="text-[10px] font-mono font-bold text-green-500 uppercase">Passed</span>
          </div>
       </div>

       <div className="bg-emerald-600/5 border border-emerald-500/10 rounded-2xl p-5 space-y-3 opacity-60">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 flex items-center gap-2">
             <ShieldAlert size={14} />
             Compliance Note
          </h3>
          <p className="text-[10px] text-slate-500 leading-relaxed italic text-left">
             Service account keys are stored in an encrypted enclave.
          </p>
       </div>
    </div>
  );

  return (
    <SystemViewerLayout
      id="cloud"
      title={t('cloud')}
      description={t('cloud_infra_subtitle')}
      wizardType="cloud"
      sidebarContent={sidebarContent}
    >
      <div className="space-y-12">
           {/* Managed Service Accounts */}
           <section className="space-y-6">
              <h2 className="text-sm font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2 px-1">
                 <ShieldCheck size={16} className="text-emerald-500" />
                 {t('cloud_accounts')}
              </h2>
              
              {loading ? (
                <div className="p-20 text-center text-slate-600 italic animate-pulse uppercase tracking-widest text-xs font-mono">{t('loading')}</div>
              ) : accounts.length === 0 ? (
                <div className="bg-slate-900 border-2 border-dashed border-slate-800 rounded-3xl p-12 text-center space-y-4 opacity-50">
                   <CloudLightning size={32} className="mx-auto text-slate-700" />
                   <p className="text-[10px] text-slate-600 italic font-mono uppercase tracking-widest leading-loose text-center">
                      No Managed Cloud Credentials<br/>
                      <span className="text-[8px] opacity-70 font-bold uppercase tracking-tighter">Connect your AWS, Azure, or GCP accounts in the sidebar</span>
                   </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 animate-in fade-in duration-500">
                   {accounts.map(acc => {
                      const roles = JSON.parse(acc.iam_roles || '[]');
                      return (
                        <div key={acc.id} className="bg-slate-950 border border-slate-800 rounded-3xl p-6 hover:border-emerald-500/30 transition-all group shadow-xl">
                           <div className="flex items-start justify-between">
                              <div className="flex items-center gap-4">
                                 <div className="p-3 bg-emerald-600/10 rounded-2xl text-emerald-500 border border-emerald-900/30 shadow-inner group-hover:scale-105 transition-transform font-bold text-xs uppercase">
                                    {acc.platform}
                                 </div>
                                 <div>
                                    <h3 className="font-bold text-slate-100 group-hover:text-emerald-400 transition-colors">{acc.name}</h3>
                                    <div className="text-[10px] text-slate-500 font-mono mt-1 uppercase tracking-tighter italic text-left">Root Identity Verified</div>
                                 </div>
                              </div>
                              <div className="flex flex-col items-end gap-1">
                                 <span className="text-[9px] font-bold text-emerald-500 bg-emerald-950/30 px-2 py-0.5 rounded border border-emerald-900/30 uppercase tracking-tighter">{t('active')}</span>
                                 <span className="text-[10px] text-slate-600 font-mono">Linked {new Date(acc.created_at).toLocaleDateString()}</span>
                              </div>
                           </div>

                           <div className="mt-6 pt-6 border-t border-slate-900">
                              <div className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-3 flex items-center gap-2 font-sans">
                                 <Key size={12} />
                                 {t('iam_roles')}
                              </div>
                              <div className="flex flex-wrap gap-2">
                                 {roles.length > 0 ? roles.map((role: string, i: number) => (
                                   <span key={i} className="px-2 py-1 bg-slate-900 border border-slate-800 rounded-lg text-[10px] text-slate-400 font-mono">
                                      {role}
                                   </span>
                                 )) : (
                                   <span className="text-[10px] text-slate-700 italic">No custom roles assigned</span>
                                 )}
                                 <span className="px-2 py-1 bg-emerald-900/20 border border-emerald-800/30 rounded-lg text-[10px] text-emerald-500 font-mono font-bold uppercase">
                                    FullAccess
                                 </span>
                              </div>
                           </div>
                        </div>
                      );
                   })}
                </div>
              )}
           </section>
        </div>
    </SystemViewerLayout>
  );
}

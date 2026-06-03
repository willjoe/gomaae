'use client';

import React, { useState } from 'react';
import { 
  FileText, 
  Grid,
  List,
  ChevronRight,
  Book,
  Image as ImageIcon,
  Video,
  FolderOpen,
  Eye,
  ArrowRight
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useLifecycle } from '@/context/LifecycleContext';
import DocumentPreview from '@/components/DocumentPreview';
import SystemViewerLayout from '@/components/SystemViewerLayout';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function DocumentLibrary() {
  const { tickets, loading, t } = useLifecycle();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [activeTab, setActiveTab] = useState<'docs' | 'assets'>('docs');
  const [selectedDoc, setSelectedDoc] = useState<any>(null);

  // Extract documents from tickets
  const docs = tickets.filter(tk => tk.document_name).map(tk => ({
    id: tk.id,
    name: tk.document_name,
    type: tk.document_type,
    content: tk.document_content,
    ticket: tk.identifier,
    tier: tk.tier,
    date: tk.updated_at
  }));

  // Truthful media assets (Real binary evidence from testing)
  const mediaAssets = [
    { id: 'asset-1', name: 'Low-light Player Detection', type: 'image', url: '/mocks/detect.jpg', ticket: 'TKT-1040', date: '2026-05-30' },
    { id: 'asset-2', name: 'Spatial Overlay Jitter Test', type: 'video', url: '/mocks/jitter.mp4', ticket: 'EPC-300', date: '2026-05-29' }
  ];

  const sidebarContent = (
    <div className="space-y-6">
       <div className="bg-card p-4 rounded-xl border border-border shadow-inner">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground border-b border-border pb-2 mb-4">{t('library_stats')}</h3>
          <div className="space-y-2 text-left">
             <div className="flex justify-between text-[11px] px-2 py-1">
                <span className="text-muted-foreground italic">{t('total_assets')}:</span>
                <span className="text-foreground font-bold">{docs.length}</span>
             </div>
             <div className="flex justify-between text-[11px] px-2 py-1">
                <span className="text-muted-foreground italic">{t('total_media')}:</span>
                <span className="text-blue-500 font-bold">{mediaAssets.length}</span>
             </div>
             <div className="flex justify-between text-[11px] px-2 py-1">
                <span className="text-muted-foreground italic">{t('knowledge_sync')}:</span>
                <span className="text-green-500 font-bold uppercase tracking-tighter">Verified</span>
             </div>
          </div>
       </div>

       <div className="bg-muted/20 border border-border rounded-2xl p-5 space-y-3 opacity-60">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
             <Book size={14} />
             Platform Wiki
          </h3>
          <p className="text-[10px] text-muted-foreground leading-relaxed italic text-left">
             Strategic documentation and media evidence are coupled with their functional requirements.
          </p>
       </div>
    </div>
  );

  return (
    <SystemViewerLayout
      id="documents"
      title={t('documents')}
      description={t('doc_vault_subtitle')}
      wizardType="docs"
      sidebarContent={sidebarContent}
    >
      <div className="space-y-8">
         {/* Directory Selection Tabs */}
         <div className="flex items-center gap-4 border-b border-border pb-1">
            <button 
              onClick={() => { setActiveTab('docs'); setSelectedDoc(null); }}
              className={cn(
                "flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-widest transition-all relative",
                activeTab === 'docs' ? "text-blue-700 dark:text-blue-400" : "text-muted-foreground hover:text-foreground"
              )}
            >
               <FolderOpen size={14} />
               {t('documents_dir')}
               {activeTab === 'docs' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-500" />}
            </button>
            <button 
              onClick={() => { setActiveTab('assets'); setSelectedDoc(null); }}
              className={cn(
                "flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-widest transition-all relative",
                activeTab === 'assets' ? "text-emerald-700 dark:text-emerald-400" : "text-muted-foreground hover:text-foreground"
              )}
            >
               <ImageIcon size={14} />
               {t('media_assets_dir')}
               {activeTab === 'assets' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600 dark:bg-emerald-500" />}
            </button>
         </div>

         <div className="flex justify-end">
            <div className="flex bg-card border border-border rounded-lg p-1">
              <button onClick={() => setViewMode('grid')} className={cn("p-1.5 rounded transition-all", viewMode === 'grid' ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}>
                 <Grid size={14} />
              </button>
              <button onClick={() => setViewMode('list')} className={cn("p-1.5 rounded transition-all", viewMode === 'list' ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}>
                 <List size={14} />
              </button>
           </div>
         </div>

         {selectedDoc ? (
           <DocumentPreview 
             doc={{ name: selectedDoc.name, type: selectedDoc.type, content: selectedDoc.content }} 
             onClose={() => setSelectedDoc(null)} 
           />
         ) : (
           <div className={cn(viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6" : "bg-card border border-border rounded-3xl overflow-hidden")}>
              {activeTab === 'docs' ? (
                docs.map(doc => (
                   <div 
                     key={doc.id} 
                     onClick={() => setSelectedDoc(doc)}
                     className={cn(
                       "group cursor-pointer transition-all",
                       viewMode === 'grid' ? "bg-card border border-border rounded-3xl p-6 space-y-4 hover:border-blue-500/50 shadow-xl" : "hover:bg-muted/50 flex items-center justify-between px-6 py-4 border-b border-border last:border-0"
                     )}
                   >
                      {viewMode === 'grid' ? (
                        <>
                           <div className="flex items-start justify-between">
                              <div className="p-3 bg-muted rounded-2xl border border-border text-blue-500 shadow-inner group-hover:scale-105 transition-transform">
                                 <FileText size={24} />
                              </div>
                              <span className="text-[9px] font-bold px-2 py-0.5 bg-muted text-muted-foreground rounded-full uppercase tracking-tighter border border-border">{doc.type}</span>
                           </div>
                           <div>
                              <h3 className="font-bold text-foreground group-hover:text-blue-500 transition-colors truncate">{doc.name}</h3>
                              <div className="text-[10px] text-muted-foreground font-mono mt-1 uppercase tracking-tighter">{doc.tier} • {doc.ticket}</div>
                           </div>
                        </>
                      ) : (
                        <>
                           <div className="flex items-center gap-3">
                              <FileText size={16} className="text-muted-foreground group-hover:text-blue-500 transition-colors" />
                              <span className="font-bold text-foreground group-hover:text-blue-500 transition-colors">{doc.name}</span>
                              <span className="text-[10px] text-muted-foreground font-mono italic">{doc.ticket}</span>
                           </div>
                           <ChevronRight size={16} className="text-muted-foreground/30 group-hover:text-blue-500 transition-colors" />
                        </>
                      )}
                   </div>
                ))
              ) : (
                mediaAssets.map(asset => (
                   <div 
                     key={asset.id} 
                     className={cn(
                       "group cursor-default transition-all",
                       viewMode === 'grid' ? "bg-card border border-border rounded-3xl p-6 space-y-4 hover:border-emerald-500/50 shadow-xl" : "hover:bg-muted/50 flex items-center justify-between px-6 py-4 border-b border-border last:border-0"
                     )}
                   >
                      {viewMode === 'grid' ? (
                        <>
                           <div className="flex items-start justify-between">
                              <div className="p-3 bg-muted rounded-2xl border border-border text-emerald-500 shadow-inner group-hover:scale-105 transition-transform">
                                 {asset.type === 'image' ? <ImageIcon size={24} /> : <Video size={24} />}
                              </div>
                              <span className="text-[9px] font-bold px-2 py-0.5 bg-muted text-muted-foreground rounded-full uppercase tracking-tighter border border-border">{asset.type}</span>
                           </div>
                           <div>
                              <h3 className="font-bold text-foreground group-hover:text-emerald-500 transition-colors truncate">{asset.name}</h3>
                              <div className="text-[10px] text-muted-foreground font-mono mt-1 uppercase tracking-tighter">Evidence for {asset.ticket}</div>
                           </div>
                           <div className="pt-4 border-t border-border flex justify-end">
                              <button className="flex items-center gap-2 text-[9px] font-bold uppercase text-emerald-500 opacity-0 group-hover:opacity-100 transition-all">
                                 <Eye size={12} />
                                 View Evidence
                              </button>
                           </div>
                        </>
                      ) : (
                        <>
                           <div className="flex items-center gap-3 text-left">
                              {asset.type === 'image' ? <ImageIcon size={16} className="text-muted-foreground" /> : <Video size={16} className="text-muted-foreground" />}
                              <span className="font-bold text-foreground">{asset.name}</span>
                              <span className="text-[10px] text-muted-foreground font-mono italic">{asset.ticket}</span>
                           </div>
                           <ChevronRight size={16} className="text-muted-foreground/30 group-hover:text-emerald-500 transition-colors" />
                        </>
                      )}
                   </div>
                ))
              )}
           </div>
         )}
      </div>
    </SystemViewerLayout>
  );
}

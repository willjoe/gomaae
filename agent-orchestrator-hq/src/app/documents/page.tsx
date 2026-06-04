'use client';

import React, { useState, useMemo } from 'react';
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
  ArrowRight,
  Folder,
  ChevronDown,
  Archive,
  Search
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useLifecycle } from '@/context/LifecycleContext';
import DocumentPreview from '@/components/DocumentPreview';
import SystemViewerLayout from '@/components/SystemViewerLayout';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface DocNode {
  id: string;
  name: string;
  type: string;
  content: string;
  path: string;
  ticket: string;
  tier: string;
  date: string;
}

export default function DocumentLibrary() {
  const { tickets, loading, t } = useLifecycle();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [activeTab, setActiveTab] = useState<'docs' | 'assets'>('docs');
  const [selectedDoc, setSelectedDoc] = useState<any>(null);
  const [currentPath, setCurrentPath] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // 1. Process documents with paths
  const allDocs = useMemo(() => {
    return tickets
      .filter(tk => tk.document_name)
      .map(tk => ({
        id: tk.id,
        name: tk.document_name,
        type: tk.document_type,
        content: tk.document_content,
        path: tk.document_path || `/general/${tk.identifier}.md`,
        ticket: tk.identifier,
        tier: tk.tier,
        date: tk.updated_at
      }));
  }, [tickets]);

  // 2. Hierarchical File System Logic
  const filesystem = useMemo(() => {
    const root: any = { type: 'folder', name: 'root', children: {} };
    
    allDocs.forEach(doc => {
      const parts = doc.path.split('/').filter((p: string) => p);
      let current = root;
      
      parts.forEach((part: string, i: number) => {
        if (i === parts.length - 1) {
          current.children[part] = { type: 'file', data: doc, name: doc.name };
        } else {
          if (!current.children[part]) {
            current.children[part] = { type: 'folder', name: part, children: {} };
          }
          current = current.children[part];
        }
      });
    });
    
    return root;
  }, [allDocs]);

  // 3. Navigation Helpers
  const navigateToFolder = (name: string) => {
    setCurrentPath(prev => [...prev, name]);
    setSelectedDoc(null);
  };

  const navigateUp = () => {
    setCurrentPath(prev => prev.slice(0, -1));
    setSelectedDoc(null);
  };

  const navigateToBreadcrumb = (index: number) => {
    setCurrentPath(prev => prev.slice(0, index + 1));
    setSelectedDoc(null);
  };

  // 4. Current View Data
  const currentItems = useMemo(() => {
    let current = filesystem;
    currentPath.forEach((part: string) => {
      if (current && current.children[part]) {
        current = current.children[part];
      }
    });

    if (!current || !current.children) return [];

    const items = Object.values(current.children).map((item: any) => ({
      ...item,
      id: item.type === 'file' ? item.data.id : item.name
    }));

    if (searchQuery) {
        return allDocs.filter(d => 
            d.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
            d.ticket.toLowerCase().includes(searchQuery.toLowerCase())
        ).map(d => ({ type: 'file', data: d, name: d.name, id: d.id }));
    }

    // Sort: Folders first, then Alphabetical
    return items.sort((a: any, b: any) => {
      if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }, [filesystem, currentPath, searchQuery, allDocs]);

  const sidebarContent = (
    <div className="space-y-6">
       <div className="bg-card p-4 rounded-xl border border-border shadow-inner">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground border-b border-border pb-2 mb-4">Storage Hierarchy</h3>
          <div className="space-y-3 text-left">
             <div className="flex items-center gap-2 text-[10px] text-foreground font-bold uppercase tracking-tighter">
                <Folder size={12} className="text-blue-500" /> /features
             </div>
             <div className="flex items-center gap-2 text-[10px] text-foreground font-bold uppercase tracking-tighter pl-3">
                <FileText size={12} className="text-muted-foreground" /> PRD / TDD / API
             </div>
             <div className="flex items-center gap-2 text-[10px] text-foreground font-bold uppercase tracking-tighter">
                <Folder size={12} className="text-amber-500" /> /initiatives
             </div>
             <div className="flex items-center gap-2 text-[10px] text-foreground font-bold uppercase tracking-tighter pl-3">
                <FileText size={12} className="text-muted-foreground" /> Business Pillars
             </div>
             <div className="flex items-center gap-2 text-[10px] text-foreground font-bold uppercase tracking-tighter">
                <Folder size={12} className="text-indigo-500" /> /general
             </div>
          </div>
       </div>

       <div className="bg-muted/20 border border-border rounded-2xl p-5 space-y-3 opacity-60">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
             <Archive size={14} />
             Vault Integrity
          </h3>
          <p className="text-[10px] text-muted-foreground leading-relaxed italic text-left">
             Documents are cryptographically linked to their originating requirements and validated through build cycles.
          </p>
       </div>
    </div>
  );

  return (
    <SystemViewerLayout
      id="documents"
      title={t('documents')}
      description="Hierarchical high-integrity documentation vault."
      wizardType="docs"
      sidebarContent={sidebarContent}
    >
      <div className="space-y-6">
         
         {/* Search & Global Actions */}
         <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative flex-1 w-full max-w-md">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input 
                    type="text" 
                    placeholder="Search technical identifiers or document names..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-card border border-border rounded-xl pl-10 pr-4 py-2 text-xs text-foreground outline-none focus:ring-2 focus:ring-blue-500/20 transition-all shadow-sm"
                />
            </div>
            <div className="flex bg-card border border-border rounded-lg p-1 shadow-sm">
              <button onClick={() => setViewMode('grid')} className={cn("p-1.5 rounded transition-all", viewMode === 'grid' ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}>
                 <Grid size={14} />
              </button>
              <button onClick={() => setViewMode('list')} className={cn("p-1.5 rounded transition-all", viewMode === 'list' ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}>
                 <List size={14} />
              </button>
           </div>
         </div>

         {/* Breadcrumbs */}
         {!searchQuery && (
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-2">
                <button onClick={() => setCurrentPath([])} className={cn("hover:text-blue-500 transition-colors", currentPath.length === 0 && "text-blue-600 font-black")}>ROOT</button>
                {currentPath.map((part, i) => (
                    <React.Fragment key={i}>
                        <ChevronRight size={10} className="opacity-30" />
                        <button 
                            onClick={() => navigateToBreadcrumb(i)}
                            className={cn("hover:text-blue-500 transition-colors", i === currentPath.length - 1 && "text-blue-600 font-black")}
                        >
                            {part}
                        </button>
                    </React.Fragment>
                ))}
            </div>
         )}

         {selectedDoc ? (
           <DocumentPreview 
             doc={{ name: selectedDoc.name, type: selectedDoc.type, content: selectedDoc.content }} 
             onClose={() => setSelectedDoc(null)} 
           />
         ) : (
           <div className={cn(
               "animate-in fade-in duration-300",
               viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4" : "bg-card border border-border rounded-3xl overflow-hidden"
           )}>
              {/* Back Button (if nested) */}
              {!searchQuery && currentPath.length > 0 && viewMode === 'grid' && (
                <div 
                    onClick={navigateUp}
                    className="bg-muted/10 border border-border border-dashed rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer hover:bg-muted/20 transition-all text-muted-foreground group"
                >
                    <FolderOpen size={24} className="mb-2 opacity-50 group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-bold uppercase tracking-tighter">Navigate Up</span>
                </div>
              )}

              {currentItems.length === 0 && (
                <div className="col-span-full py-20 text-center space-y-4 opacity-40">
                    <Archive size={48} className="mx-auto text-muted-foreground" />
                    <p className="text-xs text-muted-foreground italic uppercase tracking-widest">Directory is empty</p>
                </div>
              )}

              {currentItems.map((item: any) => (
                <div 
                  key={item.id}
                  onClick={() => item.type === 'folder' ? navigateToFolder(item.name) : setSelectedDoc(item.data)}
                  className={cn(
                    "group cursor-pointer transition-all",
                    viewMode === 'grid' 
                        ? "bg-card border border-border rounded-2xl p-5 space-y-3 hover:border-blue-500/50 shadow-lg relative overflow-hidden" 
                        : "hover:bg-muted/50 flex items-center justify-between px-6 py-3 border-b border-border last:border-0"
                  )}
                >
                    {item.type === 'folder' ? (
                        <>
                            {viewMode === 'grid' ? (
                                <>
                                    <div className="absolute top-0 right-0 p-4 opacity-5 text-blue-500">
                                        <Folder size={64} />
                                    </div>
                                    <div className="p-2.5 bg-blue-600/10 rounded-xl border border-blue-500/20 text-blue-600 w-fit">
                                        <Folder size={20} />
                                    </div>
                                    <div className="space-y-0.5">
                                        <h3 className="text-xs font-bold text-foreground uppercase tracking-tight truncate">{item.name}</h3>
                                        <p className="text-[8px] text-muted-foreground italic">Contains {Object.keys(item.children).length} elements</p>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="flex items-center gap-3">
                                        <Folder size={16} className="text-blue-500" />
                                        <span className="text-xs font-bold text-foreground uppercase tracking-tight">{item.name}</span>
                                        <span className="text-[9px] text-muted-foreground opacity-50 italic">Folder</span>
                                    </div>
                                    <ChevronRight size={14} className="text-muted-foreground/30 group-hover:text-blue-500 transition-colors" />
                                </>
                            )}
                        </>
                    ) : (
                        <>
                            {viewMode === 'grid' ? (
                                <>
                                    <div className="flex items-start justify-between">
                                        <div className={cn(
                                            "p-2.5 rounded-xl border shadow-inner transition-transform group-hover:scale-105",
                                            item.data.path.startsWith('/initiatives') ? "bg-amber-600/10 border-amber-500/20 text-amber-600" : "bg-muted border-border text-blue-500"
                                        )}>
                                            <FileText size={20} />
                                        </div>
                                        <span className="text-[8px] font-bold px-1.5 py-0.5 bg-muted text-muted-foreground rounded-full uppercase border border-border">{item.data.type}</span>
                                    </div>
                                    <div className="space-y-1">
                                        <h3 className="text-[11px] font-bold text-foreground group-hover:text-blue-500 transition-colors line-clamp-2 leading-tight">{item.name}</h3>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[8px] text-muted-foreground font-mono uppercase tracking-tighter bg-muted px-1 rounded">{item.data.ticket}</span>
                                            <span className="text-[8px] text-muted-foreground opacity-50">• {item.data.tier}</span>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="flex items-center gap-3">
                                        <FileText size={16} className={cn("transition-colors", item.data.path.startsWith('/initiatives') ? "text-amber-500" : "text-muted-foreground group-hover:text-blue-500")} />
                                        <span className="text-xs font-bold text-foreground group-hover:text-blue-500 transition-colors">{item.name}</span>
                                        <span className="text-[10px] text-muted-foreground font-mono italic opacity-50">{item.data.ticket}</span>
                                    </div>
                                    <ChevronRight size={14} className="text-muted-foreground/30 group-hover:text-blue-500 transition-colors" />
                                </>
                            )}
                        </>
                    )}
                </div>
              ))}
           </div>
         )}
      </div>
    </SystemViewerLayout>
  );
}

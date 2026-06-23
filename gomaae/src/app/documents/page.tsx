'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { 
  FileText, 
  Grid,
  List,
  ChevronRight,
  FolderOpen,
  Folder,
  Archive,
  Search,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { useLifecycle } from '@/context/LifecycleContext';
import DocumentPreview from '@/components/DocumentPreview';
import SystemViewerLayout from '@/components/SystemViewerLayout';


export default function DocumentLibrary() {
  const { t, tickets } = useLifecycle();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedDoc, setSelectedDoc] = useState<any>(null);
  const [currentPath, setCurrentPath] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [tree, setTree] = useState<any[]>([]);
  const [loadingTree, setLoadingTree] = useState(true);

  const fetchTree = async () => {
    setLoadingTree(true);
    try {
      const res = await fetch('/api/documents');
      const data = await res.json();
      if (data.success) {
        setTree(data.tree);
      }
    } catch (err) {
      console.error('Failed to fetch document tree:', err);
    } finally {
      setLoadingTree(false);
    }
  };

  useEffect(() => {
    fetchTree();
  }, []);

  // 1. Navigation Helpers
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

  // 2. Current View Data
  const currentItems = useMemo(() => {
    let current: any = { type: 'folder', children: tree };
    
    for (const part of currentPath) {
      if (current && current.children) {
        current = current.children.find((c: any) => c.type === 'folder' && c.name === part);
      }
    }

    if (!current || !current.children) return [];

    let items = [...current.children];

    if (searchQuery) {
        // Simple recursive search across full tree
        const flatten = (nodes: any[]): any[] => {
            return nodes.reduce((acc, n) => {
                if (n.type === 'file') acc.push(n);
                if (n.children) acc.push(...flatten(n.children));
                return acc;
            }, []);
        };
        items = flatten(tree).filter(f => 
            f.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
            (f.metadata?.identifier || '').toLowerCase().includes(searchQuery.toLowerCase())
        );
    }

    // Sort: Folders first, then Alphabetical
    return items.sort((a: any, b: any) => {
      if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }, [tree, currentPath, searchQuery]);

  const handleFileClick = async (doc: any) => {
    try {
        const res = await fetch(`/api/documents?path=${encodeURIComponent(doc.path)}`);
        const data = await res.json();
        if (data.success) {
            setSelectedDoc(data);
        }
    } catch (err) {
        console.error('Failed to fetch file content:', err);
    }
  };

  const sidebarContent = (
    <div className="space-y-6 text-left">
       <div className="bg-card p-4 rounded-xl border border-border shadow-inner">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground border-b border-border pb-2 mb-4">OO-DDD Hierarchy</h3>
          <div className="space-y-3">
             <div className="flex items-center gap-2 text-[10px] text-foreground font-bold uppercase tracking-tighter">
                <Folder size={12} className="text-blue-500" /> /Global
             </div>
             <div className="flex items-center gap-2 text-[10px] text-muted-foreground italic pl-3">
                Strategy & Guardrails
             </div>
             <div className="flex items-center gap-2 text-[10px] text-foreground font-bold uppercase tracking-tighter mt-4">
                <Folder size={12} className="text-emerald-500" /> /Domains
             </div>
             <div className="flex items-center gap-2 text-[10px] text-muted-foreground italic pl-3">
                Functional Logic & TDDs
             </div>
          </div>
       </div>

       <div className="bg-blue-600/5 border border-blue-500/10 rounded-2xl p-5 space-y-3">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-blue-500 flex items-center gap-2">
             <Archive size={14} />
             Vault Philosophy
          </h3>
          <p className="text-[10px] text-muted-foreground leading-relaxed italic">
             "Documentation must reflect the current, live software specifications, functioning as a blueprint that remains in perfect sync with the source code."
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
                    placeholder="Search specifications or technical IDs..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-card border border-border rounded-xl pl-10 pr-4 py-2 text-xs text-foreground outline-none focus:ring-2 focus:ring-blue-500/20 transition-all shadow-sm"
                />
            </div>
            <div className="flex items-center gap-3">
               {loadingTree && <Loader2 size={14} className="animate-spin text-blue-500" />}
               <div className="flex bg-card border border-border rounded-lg p-1 shadow-sm">
                  <button onClick={() => setViewMode('grid')} className={cn("p-1.5 rounded transition-all", viewMode === 'grid' ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}>
                     <Grid size={14} />
                  </button>
                  <button onClick={() => setViewMode('list')} className={cn("p-1.5 rounded transition-all", viewMode === 'list' ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}>
                     <List size={14} />
                  </button>
               </div>
            </div>
         </div>

         {/* Breadcrumbs */}
         {!searchQuery && (
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-2">
                <button onClick={() => setCurrentPath([])} className={cn("hover:text-blue-500 transition-colors", currentPath.length === 0 && "text-blue-600 font-black")}>WORKSPACE</button>
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
             doc={{ name: selectedDoc.name, type: selectedDoc.metadata?.document_type || 'markdown', content: selectedDoc.content }} 
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

              {currentItems.length === 0 && !loadingTree && (
                <div className="col-span-full py-20 text-center space-y-4 opacity-40">
                    <Archive size={48} className="mx-auto text-muted-foreground" />
                    <p className="text-xs text-muted-foreground italic uppercase tracking-widest">No documentation found</p>
                </div>
              )}

              {currentItems.map((item: any) => (
                <div 
                  key={item.id}
                  onClick={() => item.type === 'folder' ? navigateToFolder(item.name) : handleFileClick(item)}
                  className={cn(
                    "group cursor-pointer transition-all text-left",
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
                                        <p className="text-[8px] text-muted-foreground italic">Domain Component</p>
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
                                            item.path.startsWith('/Global') ? "bg-amber-600/10 border-amber-500/20 text-amber-600" : "bg-muted border-border text-blue-500"
                                        )}>
                                            <FileText size={20} />
                                        </div>
                                        <span className="text-[8px] font-bold px-1.5 py-0.5 bg-muted text-muted-foreground rounded-full uppercase border border-border">Spec</span>
                                    </div>
                                    <div className="space-y-1">
                                        <h3 className="text-[11px] font-bold text-foreground group-hover:text-blue-500 transition-colors line-clamp-2 leading-tight">{item.name}</h3>
                                        <div className="flex items-center gap-2">
                                            {item.metadata?.identifier && (
                                                <span className="text-[8px] text-muted-foreground font-mono uppercase tracking-tighter bg-muted px-1 rounded">{item.metadata.identifier}</span>
                                            )}
                                            <span className="text-[8px] text-muted-foreground opacity-50">• {item.metadata?.tier || 'Context'}</span>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="flex items-center gap-3">
                                        <FileText size={16} className={cn("transition-colors", item.path.startsWith('/Global') ? "text-amber-500" : "text-muted-foreground group-hover:text-blue-500")} />
                                        <span className="text-xs font-bold text-foreground group-hover:text-blue-500 transition-colors">{item.name}</span>
                                        {item.metadata?.identifier && (
                                            <span className="text-[10px] text-muted-foreground font-mono italic opacity-50">{item.metadata.identifier}</span>
                                        )}
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

'use client';

import React, { useState, useEffect } from 'react';
import { 
  FolderTree, 
  FileCode, 
  ChevronRight, 
  ChevronDown, 
  Folder, 
  File as FileIcon,
  History as HistoryIcon,
  ArrowRight
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useLifecycle } from '@/context/LifecycleContext';
import SystemViewerLayout from '@/components/SystemViewerLayout';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function RepositoryViewer() {
  const { t } = useLifecycle();
  const [expandedFolders, setExpandedFolders] = useState<string[]>([]);
  const [fileTree, setFileTree] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTree();
  }, []);

  const fetchTree = async () => {
    try {
      const res = await fetch('/api/repository');
      const data = await res.json();
      if (data.success) {
        setFileTree(data.tree);
        if (data.tree.length > 0) setExpandedFolders([data.tree[0].id]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const renderTree = (nodes: any[], depth = 0) => {
    return nodes.map(node => (
      <div key={node.id} className="select-none">
        <div 
          className={cn(
            "flex items-center gap-2 py-1.5 px-2 rounded-lg transition-colors cursor-pointer group",
            node.type === 'folder' ? "hover:bg-slate-900" : "hover:bg-blue-600/10"
          )}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
          onClick={() => node.type === 'folder' && setExpandedFolders(prev => prev.includes(node.id) ? prev.filter(f => f !== node.id) : [...prev, node.id])}
        >
          {node.type === 'folder' && (
            <ChevronRight size={14} className={cn("text-slate-600 transition-transform", expandedFolders.includes(node.id) && "rotate-90")} />
          )}
          {node.type === 'folder' ? (
             <Folder size={16} className="text-blue-400 fill-blue-400/10" />
          ) : (
             <FileCode size={16} className="text-slate-400" />
          )}
          <span className={cn("text-xs font-medium tracking-tight", node.type === 'folder' ? "text-slate-300" : "text-slate-400 group-hover:text-blue-400")}>
            {node.name}
          </span>
        </div>
        {node.type === 'folder' && expandedFolders.includes(node.id) && node.children && (
          <div className="animate-in fade-in slide-in-from-top-1 duration-200">
            {renderTree(node.children, depth + 1)}
          </div>
        )}
      </div>
    ));
  };

  return (
    <SystemViewerLayout
      id="repository"
      title={t('repository')}
      description={t('repo_hq_subtitle')}
      wizardType="repo"
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-slate-950 border border-slate-900 rounded-3xl p-6 shadow-2xl min-h-[500px]">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-900">
             <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Live Source Tree</span>
          </div>
          <div className="space-y-1">
             {loading ? (
                <div className="text-center py-20 text-slate-700 italic text-xs animate-pulse uppercase tracking-widest">{t('loading')}</div>
             ) : fileTree.length === 0 ? (
                <div className="text-center py-20 text-slate-700 italic text-xs uppercase tracking-widest">No assets found in volume.</div>
             ) : (
                renderTree(fileTree)
             )}
          </div>
        </div>
        
        <div className="space-y-6">
          <div className="bg-slate-900/50 border border-slate-800 border-dashed rounded-3xl p-12 text-center space-y-4 opacity-40">
             <HistoryIcon size={32} className="mx-auto text-slate-700" />
             <p className="text-[10px] text-slate-600 italic font-mono uppercase tracking-widest leading-loose">
                Git History Offline<br/>
                <span className="text-[8px] opacity-70">Connect a provider to sync remote commits</span>
             </p>
          </div>
        </div>
      </div>
    </SystemViewerLayout>
  );
}

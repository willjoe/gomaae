'use client';

import React, { useState, useEffect } from 'react';
import {
  FolderTree,
  FileCode,
  ChevronRight,
  ChevronDown,
  Folder,
  FolderGit2,
  File as FileIcon,
  History as HistoryIcon,
  ArrowRight,
  Download,
  GitBranch,
  GitCommitHorizontal,
  Pencil,
  Trash2,
  Check,
  X,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { useLifecycle } from '@/context/LifecycleContext';
import SystemViewerLayout from '@/components/SystemViewerLayout';
import GitGraph from '@/components/GitGraph';

type Tab = 'files' | 'graph';


export default function RepositoryViewer() {
  const { t } = useLifecycle();
  const [tab, setTab] = useState<Tab>('files');
  const [expandedFolders, setExpandedFolders] = useState<string[]>([]);
  const [fileTree, setFileTree] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Connected repositories (multi-repo management).
  const [repos, setRepos] = useState<any[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editRemote, setEditRemote] = useState('');
  const [busy, setBusy] = useState(false);
  const [repoError, setRepoError] = useState<string | null>(null);

  // Git graph
  const [graphRepos, setGraphRepos] = useState<{ name: string; commits: any[] }[]>([]);
  const [graphLoading, setGraphLoading] = useState(false);
  const [selectedGraphRepo, setSelectedGraphRepo] = useState<string>('');

  useEffect(() => {
    fetchTree();
    fetchRepos();
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

  const fetchRepos = async () => {
    try {
      const res = await fetch('/api/repository/repos');
      const data = await res.json();
      if (data.success) setRepos(data.repos || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchGraph = async () => {
    setGraphLoading(true);
    try {
      const res = await fetch('/api/repository/graph');
      const data = await res.json();
      if (data.success) {
        setGraphRepos(data.repos || []);
        if (!selectedGraphRepo && data.repos?.length > 0) setSelectedGraphRepo(data.repos[0].name);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setGraphLoading(false);
    }
  };

  useEffect(() => {
    if (tab === 'graph') fetchGraph();
  }, [tab]);

  const startEdit = (r: any) => {
    setRepoError(null);
    setEditing(r.name);
    setEditName(r.name);
    setEditRemote(r.remote || '');
  };

  const saveEdit = async (r: any) => {
    setBusy(true);
    setRepoError(null);
    try {
      const res = await fetch('/api/repository/repos', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: r.name, newName: r.single ? undefined : editName, remote: editRemote }),
      });
      const data = await res.json();
      if (!data.success) { setRepoError(data.error || 'Failed to update repository.'); return; }
      setEditing(null);
      await fetchRepos();
      await fetchTree();
    } catch (err: any) {
      setRepoError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (r: any) => {
    if (!window.confirm(`Delete repository "${r.name}"? This removes its clone from this workstation's Repository/ folder.`)) return;
    setBusy(true);
    setRepoError(null);
    try {
      const res = await fetch('/api/repository/repos', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: r.name }),
      });
      const data = await res.json();
      if (!data.success) { setRepoError(data.error || 'Failed to delete repository.'); return; }
      await fetchRepos();
      await fetchTree();
    } catch (err: any) {
      setRepoError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const [urlsInput, setUrlsInput] = useState<string>('');
  const [cloning, setCloning] = useState(false);
  const [cloneResult, setCloneResult] = useState<{ success: boolean; msg: string } | null>(null);

  const handleClone = async () => {
    const urls = urlsInput.split(/\r?\n/).map(u => u.trim()).filter(Boolean);
    if (urls.length === 0) return;
    setCloning(true);
    setCloneResult(null);
    try {
      const res = await fetch('/api/repository/clone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls })
      });
      const data = await res.json();
      if (data.success) {
         setCloneResult({ success: true, msg: `Successfully cloned: ${data.cloned.join(', ')}` });
         setUrlsInput('');
         fetchTree(); // Refresh tree
         fetchRepos(); // Refresh connected-repo list
      } else {
         setCloneResult({ success: false, msg: data.error || 'Failed to clone repositories.' });
      }
    } catch (err: any) {
       setCloneResult({ success: false, msg: err.message });
    } finally {
       setCloning(false);
    }
  };

  const renderTree = (nodes: any[], depth = 0) => {
    return nodes.map(node => (
      <div key={node.id} className="select-none">
        <div 
          className={cn(
            "flex items-center gap-2 py-1.5 px-2 rounded-lg transition-colors cursor-pointer group",
            node.type === 'folder' ? "hover:bg-muted dark:hover:bg-slate-900" : "hover:bg-blue-600/10"
          )}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
          onClick={() => node.type === 'folder' && setExpandedFolders(prev => prev.includes(node.id) ? prev.filter(f => f !== node.id) : [...prev, node.id])}
        >
          {node.type === 'folder' && (
            <ChevronRight size={14} className={cn("text-muted-foreground transition-transform", expandedFolders.includes(node.id) && "rotate-90")} />
          )}
          {node.type === 'folder' ? (
             depth === 0 ? (
               // Each root folder is a distinct repository — show a repo icon, not a plain folder.
               <FolderGit2 size={16} className="text-violet-500 dark:text-violet-400 fill-violet-500/10 dark:fill-violet-400/10" />
             ) : (
               <Folder size={16} className="text-blue-500 dark:text-blue-400 fill-blue-500/10 dark:fill-blue-400/10" />
             )
          ) : (
             <FileCode size={16} className="text-muted-foreground/70 dark:text-slate-400" />
          )}
          <span className={cn("text-xs font-medium tracking-tight", node.type === 'folder' ? "text-foreground dark:text-slate-300" : "text-muted-foreground dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400")}>
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
      {/* Tab bar */}
      <div className="flex items-center gap-1 mb-6 border-b border-border pb-0">
        {([
          { id: 'files' as Tab, label: 'Source Tree', icon: <FolderGit2 size={14} /> },
          { id: 'graph' as Tab, label: 'Git Graph', icon: <GitCommitHorizontal size={14} /> },
        ] as const).map(({ id, label, icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-widest border-b-2 transition-all -mb-px',
              tab === id
                ? 'border-blue-500 text-blue-500'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            {icon}{label}
          </button>
        ))}
      </div>

      {tab === 'graph' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {graphRepos.map(r => (
                <button
                  key={r.name}
                  onClick={() => setSelectedGraphRepo(r.name)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors',
                    selectedGraphRepo === r.name
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'border-border text-muted-foreground hover:border-blue-500/50'
                  )}
                >
                  {r.name}
                </button>
              ))}
            </div>
            <button
              onClick={fetchGraph}
              disabled={graphLoading}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground hover:border-border/80 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={13} className={graphLoading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>

          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center gap-2">
              <GitBranch size={14} className="text-blue-500" />
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Branch Activity</span>
              {(() => {
                const repo = graphRepos.find(r => r.name === selectedGraphRepo);
                return repo ? (
                  <span className="ml-auto text-[10px] text-muted-foreground/60 font-mono">{repo.commits.length} commits</span>
                ) : null;
              })()}
            </div>
            {graphLoading ? (
              <div className="flex items-center justify-center gap-2 py-20 text-muted-foreground text-xs">
                <Loader2 size={16} className="animate-spin" /> Loading git history…
              </div>
            ) : (() => {
              const repo = graphRepos.find(r => r.name === selectedGraphRepo);
              if (!repo) return (
                <div className="py-20 text-center text-xs text-muted-foreground italic">
                  No repository selected or no commits found.
                </div>
              );
              if (repo.commits.length === 0) return (
                <div className="py-20 text-center text-xs text-muted-foreground italic">
                  No commits yet in this repository.
                </div>
              );
              return (
                <div className="overflow-auto max-h-[640px] custom-scrollbar">
                  <GitGraph commits={repo.commits} />
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {tab === 'files' && <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-card border border-border rounded-3xl p-6 shadow-2xl min-h-[500px]">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-border">
             <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Live Source Tree</span>
             <button
                onClick={() => window.location.href = '/api/repository/download'}
                className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all shadow-lg active:scale-95"
             >
                <Download size={14} />
                Download Repository
             </button>
          </div>
          <div className="space-y-1">
             {loading ? (
                <div className="text-center py-20 text-muted-foreground italic text-xs animate-pulse uppercase tracking-widest">{t('loading')}</div>
             ) : fileTree.length === 0 ? (
                <div className="text-center py-20 text-muted-foreground italic text-xs uppercase tracking-widest">No assets found in volume.</div>
             ) : (
                renderTree(fileTree)
             )}
          </div>
        </div>
        
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-3xl p-6 shadow-md">
             <div className="flex items-center gap-2 mb-4">
                <FolderTree className="text-blue-500" size={18} />
                <h3 className="font-bold uppercase tracking-widest text-xs text-muted-foreground">Add Repositories</h3>
             </div>
             <p className="text-xs text-muted-foreground mb-4">
                Enter Git repository URLs (one per line) to clone them into this workspace.
             </p>
             <textarea 
                className="w-full bg-muted/50 border border-border rounded-xl p-3 text-xs font-mono mb-4 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                rows={6}
                placeholder="https://github.com/org/repo1.git&#10;https://github.com/org/repo2.git"
                value={urlsInput}
                onChange={(e) => setUrlsInput(e.target.value)}
                disabled={cloning}
             />
             <button 
                onClick={handleClone}
                disabled={cloning || urlsInput.trim().length === 0}
                className="w-full py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs uppercase tracking-widest rounded-xl transition-colors flex items-center justify-center gap-2"
             >
                {cloning ? 'Cloning...' : 'Clone Repositories'}
             </button>
             {cloneResult && (
               <div className={cn("mt-4 p-3 rounded-xl text-xs", cloneResult.success ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" : "bg-red-500/10 text-red-500 border border-red-500/20")}>
                 {cloneResult.msg}
               </div>
             )}
          </div>

          <div className="bg-card border border-border rounded-3xl p-6 shadow-md">
             <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                   <GitBranch className="text-blue-500" size={18} />
                   <h3 className="font-bold uppercase tracking-widest text-xs text-muted-foreground">Connected Repositories</h3>
                </div>
                <span className="px-1.5 py-0.5 rounded-md bg-muted border border-border text-[9px] font-mono text-muted-foreground">{repos.length}</span>
             </div>

             {repoError && (
                <div className="mb-3 p-2.5 rounded-xl text-[11px] bg-red-500/10 text-red-500 border border-red-500/20">{repoError}</div>
             )}

             {repos.length === 0 ? (
                <p className="text-[11px] text-muted-foreground italic py-6 text-center opacity-60">
                   No repositories connected yet. Clone one above to get started.
                </p>
             ) : (
                <div className="space-y-2.5">
                   {repos.map((r) => (
                      <div key={r.name} className="border border-border rounded-2xl p-3 bg-muted/20">
                         {editing === r.name ? (
                            <div className="space-y-2">
                               {!r.single && (
                                  <input
                                     value={editName}
                                     onChange={(e) => setEditName(e.target.value)}
                                     placeholder="Repository name"
                                     className="w-full bg-card border border-border rounded-lg px-2.5 py-1.5 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500/30"
                                  />
                               )}
                               <input
                                  value={editRemote}
                                  onChange={(e) => setEditRemote(e.target.value)}
                                  placeholder="origin remote URL"
                                  className="w-full bg-card border border-border rounded-lg px-2.5 py-1.5 text-[11px] font-mono outline-none focus:ring-2 focus:ring-blue-500/30"
                               />
                               <div className="flex items-center gap-2 justify-end">
                                  <button onClick={() => setEditing(null)} disabled={busy} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:bg-muted transition-all">
                                     <X size={12} /> Cancel
                                  </button>
                                  <button onClick={() => saveEdit(r)} disabled={busy} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest bg-blue-600 hover:bg-blue-500 text-white transition-all disabled:opacity-50">
                                     {busy ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Save
                                  </button>
                               </div>
                            </div>
                         ) : (
                            <div className="flex items-start justify-between gap-3">
                               <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                     <span className="text-xs font-bold text-foreground truncate">{r.name}</span>
                                     {r.single && <span className="text-[8px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-slate-500/10 text-slate-500 border border-slate-500/20">root</span>}
                                     {r.branch && <span className="text-[8px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 border border-blue-500/20">{r.branch}</span>}
                                  </div>
                                  <div className="text-[10px] text-muted-foreground font-mono truncate mt-0.5">{r.remote || 'no remote configured'}</div>
                               </div>
                               <div className="flex items-center gap-1 shrink-0">
                                  <button onClick={() => startEdit(r)} title="Edit remote / rename" className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all">
                                     <Pencil size={13} />
                                  </button>
                                  {!r.single && (
                                     <button onClick={() => handleDelete(r)} title="Delete repository" className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-all">
                                        <Trash2 size={13} />
                                     </button>
                                  )}
                               </div>
                            </div>
                         )}
                      </div>
                   ))}
                </div>
             )}
          </div>
        </div>
      </div>}
    </SystemViewerLayout>
  );
}

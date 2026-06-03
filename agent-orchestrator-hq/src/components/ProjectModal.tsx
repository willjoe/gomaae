'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  Save, 
  Plus, 
  Bot, 
  FolderTree,
  ScrollText,
  ShieldCheck,
  Settings
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProjectCreated?: () => void;
  editProject?: any;
}

export default function ProjectModal({ isOpen, onClose, onProjectCreated, editProject }: ProjectModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [repoPath, setRepoPath] = useState('');
  const [docsPath, setDocsPath] = useState('');
  const [useDefaults, setUseDefault] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editProject && isOpen) {
      setName(editProject.name || '');
      setDescription(editProject.description || '');
      setRepoPath(editProject.repo_path || '');
      setDocsPath(editProject.docs_path || '');
      // If editing and paths look custom, uncheck defaults
      const isDefaultRepo = (editProject.repo_path || '').includes('/app/repos/');
      const isDefaultDocs = (editProject.docs_path || '').includes('/app/docs/');
      setUseDefault(isDefaultRepo && isDefaultDocs);
    } else if (isOpen && !editProject) {
      setName('');
      setDescription('');
      setRepoPath('');
      setDocsPath('');
      setUseDefault(true);
    }
  }, [editProject, isOpen]);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!name) return;
    if (!useDefaults && (!repoPath || !docsPath)) return;
    
    setSaving(true);
    
    // Application defaults
    const finalRepoPath = useDefaults ? `/app/repos/${name.toLowerCase().replace(/\s+/g, '-')}` : repoPath;
    const finalDocsPath = useDefaults ? `/app/docs/${name.toLowerCase().replace(/\s+/g, '-')}` : docsPath;

    try {
      const isEdit = !!editProject;
      const res = await fetch('/api/projects', {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            id: editProject?.id,
            name, 
            description, 
            repo_path: finalRepoPath, 
            docs_path: finalDocsPath 
        })
      });
      const data = await res.json();
      if (data.success) {
        onProjectCreated?.();
        onClose();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 font-sans text-left transition-colors duration-300">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm animate-in fade-in duration-300" 
        onClick={onClose} 
      />
      
      {/* Modal Card */}
      <div className="relative w-full max-w-lg bg-card border border-border rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 transition-colors">
        {/* Header */}
        <div className="p-6 border-b border-border bg-muted/30 dark:bg-slate-900/50 flex items-center justify-between">
           <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600 rounded-xl text-white shadow-lg shadow-blue-900/40">
                 {editProject ? <Settings size={18} /> : <Plus size={18} />}
              </div>
              <div>
                 <h2 className="text-lg font-bold text-foreground tracking-tight">{editProject ? 'Workspace Properties' : 'New Project Profile'}</h2>
                 <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">{editProject ? 'Edit Configuration' : 'Workspace Initialization'}</p>
              </div>
           </div>
           <button onClick={onClose} className="p-2 hover:bg-muted rounded-full text-muted-foreground hover:text-foreground transition-colors">
              <X size={20} />
           </button>
        </div>

        {/* Body */}
        <div className="p-8 space-y-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
           <div className="space-y-2 text-left">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1 block text-left">Project Identity</label>
              <input 
                 autoFocus
                 type="text" 
                 placeholder="e.g. Autonomous Spectator Mode" 
                 value={name}
                 onChange={(e) => setName(e.target.value)}
                 className="w-full bg-muted/30 border border-border rounded-xl px-4 py-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-bold italic placeholder:text-muted-foreground/40"
              />
           </div>

           {/* Default Path Toggle */}
           <div 
              onClick={() => setUseDefault(!useDefaults)}
              className={cn(
                "p-4 rounded-2xl border transition-all cursor-pointer group",
                useDefaults ? "bg-blue-600/5 border-blue-500/30" : "bg-muted/30 border-border hover:border-border/80"
              )}
           >
              <div className="flex items-center justify-between">
                 <div className="flex items-center gap-3">
                    <ShieldCheck size={18} className={cn(useDefaults ? "text-blue-500" : "text-muted-foreground")} />
                    <div className="text-left">
                       <div className="text-[10px] font-bold uppercase tracking-tight text-foreground">Use Default Workspace</div>
                       <p className="text-[9px] text-muted-foreground italic">Automated directory management within app-specific storage.</p>
                    </div>
                 </div>
                 <div className={cn(
                    "w-8 h-4 rounded-full relative transition-colors duration-300",
                    useDefaults ? "bg-blue-600" : "bg-slate-300 dark:bg-slate-800"
                 )}>
                    <div className={cn(
                      "absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform duration-300",
                      useDefaults ? "translate-x-4" : "translate-x-0"
                    )} />
                 </div>
              </div>
           </div>

           {!useDefaults && (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="space-y-2 text-left">
                   <div className="flex items-center gap-2 px-1">
                      <FolderTree size={12} className="text-blue-500" />
                      <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest text-left">Git Repository Path</label>
                   </div>
                   <input 
                      type="text" 
                      placeholder="/Users/will/Code/..." 
                      value={repoPath}
                      onChange={(e) => setRepoPath(e.target.value)}
                      className="w-full bg-muted/30 border border-border rounded-xl px-4 py-2.5 text-[10px] text-foreground outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-mono italic"
                   />
                </div>

                <div className="space-y-2 text-left">
                   <div className="flex items-center gap-2 px-1">
                      <ScrollText size={12} className="text-purple-500" />
                      <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest text-left">Docs & Assets Dir</label>
                   </div>
                   <input 
                      type="text" 
                      placeholder="/Users/will/Documents/..." 
                      value={docsPath}
                      onChange={(e) => setDocsPath(e.target.value)}
                      className="w-full bg-muted/30 border border-border rounded-xl px-4 py-2.5 text-[10px] text-foreground outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-mono italic"
                   />
                </div>
             </div>
           )}

           <div className="space-y-2 text-left">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1 block text-left">Strategic Objective</label>
              <textarea 
                 placeholder="Describe the high-level mission..." 
                 rows={2}
                 value={description}
                 onChange={(e) => setDescription(e.target.value)}
                 className="w-full bg-muted/30 border border-border rounded-xl px-4 py-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-blue-500/20 transition-all resize-none italic placeholder:text-muted-foreground/40"
              />
           </div>

           <div className="bg-blue-600/5 border border-blue-500/10 rounded-2xl p-4 flex gap-4 text-left">
              <div className="shrink-0 text-blue-500">
                 <Bot size={20} />
              </div>
              <p className="text-[10px] text-muted-foreground leading-relaxed italic">
                 Initialization will map local paths for Git and Documentation. Ticket Manager will be managed internally for high-integrity synchronization.
              </p>
           </div>
        </div>

        {/* Footer */}
        <div className="p-6 bg-muted/10 border-t border-border flex justify-end">
           <button 
             onClick={handleSave}
             disabled={saving || !name || (!useDefaults && (!repoPath || !docsPath))}
             className="flex items-center gap-2 px-8 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-border dark:disabled:bg-slate-800 text-white rounded-xl font-bold transition-all shadow-lg active:scale-95 shadow-blue-900/20 text-xs uppercase tracking-widest"
           >
              <Save size={16} />
              {saving ? 'Saving...' : (editProject ? 'Save Changes' : 'Initialize Project')}
           </button>
        </div>
      </div>
    </div>
  );
}

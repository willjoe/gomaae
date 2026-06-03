'use client';

import React, { useState } from 'react';
import { 
  X, 
  Save, 
  Plus, 
  Bot, 
  FolderTree,
  ScrollText
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
}

export default function ProjectModal({ isOpen, onClose, onProjectCreated }: ProjectModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [repoPath, setRepoPath] = useState('');
  const [docsPath, setDocsPath] = useState('');
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleCreate = async () => {
    if (!name || !repoPath || !docsPath) return;
    setSaving(true);
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            name, 
            description, 
            repo_path: repoPath, 
            docs_path: docsPath 
        })
      });
      const data = await res.json();
      if (data.success) {
        setName('');
        setDescription('');
        setRepoPath('');
        setDocsPath('');
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
                 <Plus size={18} />
              </div>
              <div>
                 <h2 className="text-lg font-bold text-foreground tracking-tight">New Project Profile</h2>
                 <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Workspace Initialization</p>
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

           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
             onClick={handleCreate}
             disabled={saving || !name || !repoPath || !docsPath}
             className="flex items-center gap-2 px-8 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-border dark:disabled:bg-slate-800 text-white rounded-xl font-bold transition-all shadow-lg active:scale-95 shadow-blue-900/20 text-xs uppercase tracking-widest"
           >
              <Save size={16} />
              {saving ? 'Configuring Paths...' : 'Initialize Project'}
           </button>
        </div>
      </div>
    </div>
  );
}

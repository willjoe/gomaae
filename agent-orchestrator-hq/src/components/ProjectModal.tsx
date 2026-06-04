'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  Save, 
  Plus, 
  Bot, 
  FolderTree,
  ShieldCheck,
  Settings,
  Trash2,
  AlertTriangle,
  CloudLightning,
  Home
} from 'lucide-react';
import { cn } from '@/lib/cn';


interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProjectCreated?: () => void;
  editProject?: any;
}

export default function ProjectModal({ isOpen, onClose, onProjectCreated, editProject }: ProjectModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [workspaceRoot, setWorkspaceRoot] = useState('');
  const [useDefaults, setUseDefault] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [cloudSynced, setCloudSynced] = useState(false);

  useEffect(() => {
    if (editProject && isOpen) {
      setName(editProject.name || '');
      setDescription(editProject.description || '');
      setWorkspaceRoot(editProject.workspace_root || '');
      // If editing and path looks custom, uncheck defaults
      const isDefault = (editProject.workspace_root || '').includes('/Agentic/');
      setUseDefault(isDefault);
      setShowDeleteConfirm(false);
      setCloudSynced(false);
    } else if (isOpen && !editProject) {
      setName('');
      setDescription('');
      setWorkspaceRoot('');
      setUseDefault(true);
      setShowDeleteConfirm(false);
      setCloudSynced(false);
    }
  }, [editProject, isOpen]);

  // Update default path when name changes
  useEffect(() => {
    if (useDefaults && name && !editProject) {
        const slug = name.toLowerCase().replace(/\s+/g, '-');
        setWorkspaceRoot(`/Users/will/Agentic/${slug}`);
    }
  }, [name, useDefaults, editProject]);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!name) return;
    if (!useDefaults && !workspaceRoot) return;
    
    setSaving(true);
    
    const slug = name.toLowerCase().replace(/\s+/g, '-');
    const finalPath = useDefaults ? `/Users/will/Agentic/${slug}` : workspaceRoot;

    try {
      const isEdit = !!editProject;
      const res = await fetch('/api/projects', {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            id: editProject?.id,
            name, 
            description, 
            workspace_root: finalPath
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

  const handleDelete = async () => {
    if (!cloudSynced) return;
    setSaving(true);
    try {
      const res = await fetch('/api/projects', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editProject?.id })
      });
      if ((await res.json()).success) {
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
                 {showDeleteConfirm ? <AlertTriangle size={18} /> : (editProject ? <Settings size={18} /> : <Plus size={18} />)}
              </div>
              <div>
                 <h2 className="text-lg font-bold text-foreground tracking-tight">
                    {showDeleteConfirm ? 'Delete Workspace' : (editProject ? 'Workspace Properties' : 'New Project Profile')}
                 </h2>
                 <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">
                    {showDeleteConfirm ? 'Immediate Purge' : (editProject ? 'Edit Configuration' : 'Workspace Initialization')}
                 </p>
              </div>
           </div>
           <button onClick={onClose} className="p-2 hover:bg-muted rounded-full text-muted-foreground hover:text-foreground transition-colors">
              <X size={20} />
           </button>
        </div>

        {/* Body */}
        <div className="p-8 space-y-6 max-h-[75vh] overflow-y-auto custom-scrollbar">
           {!showDeleteConfirm ? (
             <>
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
                           <div className="text-[10px] font-bold uppercase tracking-tight text-foreground">Standardized Hierarchy</div>
                           <p className="text-[9px] text-muted-foreground italic">Automated directory management in ~/Agentic folder.</p>
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
                 <div className="space-y-2 text-left animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="flex items-center gap-2 px-1">
                       <Home size={12} className="text-blue-500" />
                       <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest text-left">Workspace Root Path</label>
                    </div>
                    <input 
                       type="text" 
                       placeholder="/Users/will/Agentic/..." 
                       value={workspaceRoot}
                       onChange={(e) => setWorkspaceRoot(e.target.value)}
                       className="w-full bg-muted/30 border border-border rounded-xl px-4 py-2.5 text-[10px] text-foreground outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-mono italic"
                    />
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

               {editProject && (
                 <div className="pt-4 border-t border-border flex justify-between items-center">
                    <div className="space-y-1">
                       <div className="text-[10px] font-bold text-foreground uppercase tracking-tight">Danger Zone</div>
                       <p className="text-[8px] text-muted-foreground italic text-left">Permanently remove this project workspace.</p>
                    </div>
                    <button 
                      onClick={() => setShowDeleteConfirm(true)}
                      className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-lg transition-all text-[10px] font-bold uppercase tracking-widest border border-red-500/20"
                    >
                       <Trash2 size={12} />
                       Delete Workspace
                    </button>
                 </div>
               )}

               <div className="bg-blue-600/5 border border-blue-500/10 rounded-2xl p-4 flex gap-4 text-left">
                  <div className="shrink-0 text-blue-500">
                     <Bot size={20} />
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-relaxed italic">
                     Consolidated workspace root ensures high-integrity context isolation for autonomous agent cycles.
                  </p>
               </div>
             </>
           ) : (
             <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300 text-center py-4">
                <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-2xl flex items-center justify-center mx-auto border border-red-500/20 shadow-xl shadow-red-900/10">
                   <AlertTriangle size={32} />
                </div>
                <div className="space-y-2">
                   <h3 className="text-xl font-bold text-foreground tracking-tight italic">Confirm Permanent Deletion?</h3>
                   <p className="text-xs text-muted-foreground max-sm mx-auto leading-relaxed">
                      You are about to delete <span className="font-bold text-foreground">"{name}"</span>. This action is irreversible and will purge all local database records for this project.
                   </p>
                </div>

                <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl space-y-3 text-left">
                   <div className="flex items-start gap-3">
                      <ShieldCheck size={18} className="text-amber-500 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                         <div className="text-[10px] font-bold text-foreground uppercase tracking-tight">High-Integrity Constraint</div>
                         <p className="text-[9px] text-muted-foreground italic">If using standardized hierarchy, the workspace folder will be physically removed from the system.</p>
                      </div>
                   </div>
                </div>

                <div 
                   onClick={() => setCloudSynced(!cloudSynced)}
                   className={cn(
                      "p-5 rounded-2xl border transition-all cursor-pointer group flex items-center justify-between",
                      cloudSynced ? "bg-green-600/5 border-green-500/30" : "bg-red-600/5 border-red-500/30 animate-pulse"
                   )}
                >
                   <div className="flex items-center gap-3">
                      <CloudLightning size={20} className={cn(cloudSynced ? "text-green-500" : "text-red-500")} />
                      <div className="text-left flex-1">
                         <div className="text-[10px] font-bold uppercase tracking-tight text-foreground">Cloud Synchronization Verified</div>
                         <p className="text-[9px] text-muted-foreground italic">I confirm that all critical assets have been pushed to remote storage.</p>
                      </div>
                   </div>
                   <div className={cn(
                      "w-5 h-5 rounded border-2 flex items-center justify-center transition-all shrink-0",
                      cloudSynced ? "bg-green-600 border-green-500 text-white" : "border-red-500/50"
                   )}>
                      {cloudSynced && <Plus size={14} className="rotate-45" />}
                   </div>
                </div>

                <div className="flex items-center gap-3 pt-4">
                   <button 
                     onClick={() => setShowDeleteConfirm(false)}
                     className="flex-1 py-3 bg-muted hover:bg-muted/80 text-muted-foreground rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all"
                   >
                      Cancel
                   </button>
                   <button 
                     onClick={handleDelete}
                     disabled={!cloudSynced || saving}
                     className="flex-1 py-3 bg-red-600 hover:bg-red-500 disabled:bg-muted disabled:text-muted-foreground/30 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all shadow-lg shadow-red-900/20 active:scale-95"
                   >
                      {saving ? 'Purging Workspace...' : 'Delete Permanently'}
                   </button>
                </div>
             </div>
           )}
        </div>

        {/* Footer */}
        {!showDeleteConfirm && (
          <div className="p-6 bg-muted/10 border-t border-border flex justify-end">
             <button 
               onClick={handleSave}
               disabled={saving || !name || (!useDefaults && !workspaceRoot)}
               className="flex items-center gap-2 px-8 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-border dark:disabled:bg-slate-800 text-white rounded-xl font-bold transition-all shadow-lg active:scale-95 shadow-blue-900/20 text-xs uppercase tracking-widest"
             >
                <Save size={16} />
                {saving ? 'Saving...' : (editProject ? 'Save Changes' : 'Initialize Project')}
             </button>
          </div>
        )}
      </div>
    </div>
  );
}

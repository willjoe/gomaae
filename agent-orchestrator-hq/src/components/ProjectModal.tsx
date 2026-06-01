'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  Save, 
  Plus, 
  Bot, 
  Briefcase 
} from 'lucide-react';

interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProjectCreated?: () => void;
}

export default function ProjectModal({ isOpen, onClose, onProjectCreated }: ProjectModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleCreate = async () => {
    if (!name) return;
    setSaving(true);
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description })
      });
      if ((await res.json()).success) {
        setName('');
        setDescription('');
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 font-sans">
      <div 
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-300" 
        onClick={onClose} 
      />
      
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-slate-800 bg-slate-950/50 flex items-center justify-between">
           <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600 rounded-xl text-white shadow-lg shadow-blue-900/40">
                 <Plus size={18} />
              </div>
              <div>
                 <h2 className="text-lg font-bold text-white tracking-tight">New Project Profile</h2>
                 <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Asset Isolation Mode</p>
              </div>
           </div>
           <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
              <X size={20} />
           </button>
        </div>

        <div className="p-8 space-y-6">
           <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Project Identity</label>
              <input 
                 autoFocus
                 type="text" 
                 placeholder="e.g. Autonomous Spectator Mode" 
                 value={name}
                 onChange={(e) => setName(e.target.value)}
                 className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-bold italic"
              />
           </div>

           <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Strategic Objective</label>
              <textarea 
                 placeholder="Describe the high-level mission..." 
                 rows={3}
                 value={description}
                 onChange={(e) => setDescription(e.target.value)}
                 className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-300 outline-none focus:ring-2 focus:ring-blue-500/20 transition-all resize-none italic"
              />
           </div>

           <div className="bg-blue-600/5 border border-blue-500/10 rounded-2xl p-4 flex gap-4">
              <div className="shrink-0 text-blue-500">
                 <Bot size={20} />
              </div>
              <p className="text-[10px] text-slate-400 leading-relaxed italic">
                 New projects automatically generate a dedicated SQLite volume and isolated prompt history for agentic integrity.
              </p>
           </div>
        </div>

        <div className="p-6 bg-slate-950/50 border-t border-slate-800 flex justify-end">
           <button 
             onClick={handleCreate}
             disabled={saving || !name}
             className="flex items-center gap-2 px-8 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white rounded-xl font-bold transition-all shadow-lg active:scale-95 shadow-blue-900/20 text-xs uppercase tracking-widest"
           >
              <Save size={16} />
              {saving ? 'Creating Volume...' : 'Initialize Project'}
           </button>
        </div>
      </div>
    </div>
  );
}

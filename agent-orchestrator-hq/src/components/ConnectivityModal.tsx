'use client';

import React from 'react';
import { 
  X, 
  Globe, 
  GitBranch, 
  Server, 
  Cloud, 
  Monitor, 
  PenTool, 
  Book, 
  FileText, 
  Bot, 
  Sparkles, 
  BrainCircuit,
  ChevronRight,
  ShieldCheck,
  Cpu,
  Database,
  Layout,
  MessageSquare,
  ArrowLeft,
  Zap
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type ConnectivityType = 'repository' | 'sync' | 'docs' | 'ai' | null;

interface ConnectivityModalProps {
  type: ConnectivityType;
  isOpen: boolean;
  onClose: () => void;
}

export default function ConnectivityModal({ type, isOpen, onClose }: ConnectivityModalProps) {
  if (!isOpen || !type) return null;

  const getContent = () => {
    switch (type) {
      case 'repository':
        return {
          title: 'Select Git Platform',
          description: 'Link your local work to a remote Git provider for online backup and sharing.',
          color: 'text-green-400',
          platforms: [
            { id: 'github', name: 'GitHub', description: 'Host source code & enable remote backup.', icon: <Globe size={20} className="text-blue-400" /> },
            { id: 'gitlab', name: 'GitLab', description: 'Internal or cloud-hosted management.', icon: <Server size={20} className="text-orange-400" /> },
            { id: 'bitbucket', name: 'Bitbucket', description: 'Professional-grade code hosting.', icon: <Cloud size={20} className="text-blue-600" />, status: 'Soon' }
          ]
        };
      case 'sync':
        return {
          title: 'Select Tracker Platform',
          description: 'Bridge your local requirements with team collaboration tools.',
          color: 'text-purple-400',
          platforms: [
            { id: 'linear', name: 'Linear', description: 'High-performance team tracking.', icon: <Monitor size={20} className="text-purple-400" /> },
            { id: 'github-issues', name: 'GitHub Issues', description: 'Sync with GitHub labels & issues.', icon: <Globe size={20} className="text-blue-400" /> },
            { id: 'jira', name: 'Atlassian Jira', description: 'Enterprise ticket synchronization.', icon: <Layout size={20} className="text-blue-600" />, status: 'Soon' }
          ]
        };
      case 'docs':
        return {
          title: 'Select Documentation Platform',
          description: 'Sync local architecture docs with team knowledge bases.',
          color: 'text-slate-100',
          platforms: [
            { id: 'notion', name: 'Notion', description: 'Workspace for wiki and projects.', icon: <PenTool size={20} className="text-slate-100" /> },
            { id: 'confluence', name: 'Confluence', description: 'Enterprise team collaboration.', icon: <Book size={20} className="text-blue-500" /> },
            { id: 'google-docs', name: 'Google Docs', description: 'Real-time collaborative editing.', icon: <FileText size={20} className="text-blue-400" />, status: 'Soon' }
          ]
        };
      case 'ai':
        return {
          title: 'Select AI Provider',
          description: 'Choose the intelligence engine for autonomous workers.',
          color: 'text-amber-400',
          platforms: [
            { id: 'anthropic', name: 'Anthropic Claude', description: 'Coding and reasoning agents.', icon: <Bot size={20} className="text-amber-400" /> },
            { id: 'google', name: 'Google Gemini', description: 'Long-context codebase analysis.', icon: <Sparkles size={20} className="text-blue-400" /> },
            { id: 'openai', name: 'OpenAI GPT-4', description: 'General task execution standard.', icon: <BrainCircuit size={20} className="text-emerald-400" />, status: 'Soon' }
          ]
        };
    }
  };

  const data = getContent();

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={onClose}
      />
      
      {/* Modal Card */}
      <div className="relative w-full max-w-2xl bg-slate-950 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 border-b border-slate-900 flex items-center justify-between bg-slate-900/50">
          <div className="flex items-center gap-3">
             <div className={cn("p-2 rounded-xl bg-slate-950 border border-slate-800", data.color)}>
                {type === 'repository' && <GitBranch size={20} />}
                {type === 'sync' && <Monitor size={20} />}
                {type === 'docs' && <Book size={20} />}
                {type === 'ai' && <Zap size={20} />}
             </div>
             <div>
                <h2 className="text-xl font-bold text-white">{data.title}</h2>
                <p className="text-xs text-slate-500 italic">{data.description}</p>
             </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-full text-slate-500 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-8 space-y-6">
           <div className="grid gap-3">
              {data.platforms.map((p) => (
                <div
                  key={p.id}
                  className={cn(
                    "p-5 bg-slate-900/50 border border-slate-800 rounded-2xl flex items-center justify-between transition-all group",
                    p.status !== 'Soon' ? "hover:border-blue-500/30 hover:bg-blue-600/5 cursor-pointer" : "opacity-50 grayscale cursor-not-allowed"
                  )}
                  onClick={() => p.status !== 'Soon' && (window.location.href = '/settings')}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-slate-950 rounded-xl flex items-center justify-center border border-slate-800 group-hover:scale-105 transition-transform">
                        {p.icon}
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-100">{p.name}</h3>
                        <p className="text-[11px] text-slate-500">{p.description}</p>
                    </div>
                  </div>
                  {p.status === 'Soon' ? (
                    <span className="text-[9px] font-bold uppercase text-slate-600 bg-slate-800 px-2 py-1 rounded">Beta</span>
                  ) : (
                    <ChevronRight size={16} className="text-slate-700 group-hover:text-blue-500 transition-all" />
                  )}
                </div>
              ))}
           </div>

           <div className="bg-blue-600/5 border border-blue-500/10 rounded-2xl p-4 flex items-start gap-4">
              <ShieldCheck size={18} className="text-blue-500 mt-1 shrink-0" />
              <p className="text-[11px] text-slate-500 leading-relaxed italic">
                All credentials for {data.title} are stored strictly within your local SQLite database and never leave this environment.
              </p>
           </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-900/30 border-t border-slate-900 text-center">
           <button 
             onClick={onClose}
             className="text-xs font-bold text-slate-500 hover:text-slate-300 uppercase tracking-widest"
           >
             Continue Locally
           </button>
        </div>
      </div>
    </div>
  );
}

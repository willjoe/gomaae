'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Settings as SettingsIcon,
  Code2,
  Users,
  FlaskConical,
  Rocket,
  CheckCircle2,
  Trophy,
  BookOpen,
  GitBranch,
  Cloud,
  CloudOff,
  Ticket as TicketIcon,
  Zap,
  ZapOff,
  ClipboardList,
  ChevronDown,
  Bot,
  Plus,
  FolderTree,
  ScrollText,
  CloudLightning,
  Monitor,
  Activity,
  Cpu,
  Unplug,
  Palette,
  Globe,
  Sun,
  Moon,
  Database,
  Shield,
  MessageSquare,
} from 'lucide-react';
import FeedbackModal from '@/components/FeedbackModal';
import { cn } from '@/lib/cn';
import { getPhaseTheme } from '@/lib/phaseConfig';
import { useLifecycle } from '@/context/LifecycleContext';


interface Project {
  id: string;
  name: string;
  is_active: number;
}

interface SidebarProps {
  config: any;
  activeProjectName: string;
  projects: Project[];
  onSwitchProject: (id: string) => void;
  onOpenNewProject: () => void;
  onOpenProjectSettings?: () => void;
  activePath?: string;
  onNavigate?: (path: string) => void;
}

export default function Sidebar({ config, activeProjectName, projects, onSwitchProject, onOpenNewProject, onOpenProjectSettings, activePath, onNavigate }: SidebarProps) {
  const currentPathname = usePathname();

  const pathname = activePath || currentPathname;
  const { t, language, updateLanguage, appearance, updateAppearance, tickets } = useLifecycle();
  const ticketCount = (tickets?.length ?? 0) >= 1000 ? `${((tickets.length) / 1000).toFixed(1)}k` : String(tickets?.length ?? 0);
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Auto-save logic
  const persistConfig = useCallback(async (updates: { language?: string, appearance?: string }) => {
    try {
      await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language: updates.language || language,
          appearance: updates.appearance || appearance
        })
      });
    } catch (err) {
      console.error('Failed to auto-save settings from sidebar:', err);
    }
  }, [language, appearance]);

  const handleAppearanceChange = (val: 'light' | 'dark' | 'system') => {
    updateAppearance(val);
    persistConfig({ appearance: val });
  };

  const handleLanguageChange = (val: string) => {
    updateLanguage(val);
    persistConfig({ language: val });
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsProjectDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLinkClick = (path: string, e: React.MouseEvent) => {
    if (onNavigate) {
      e.preventDefault();
      onNavigate(path);
    }
  };

  const phases = [
    { id: 'initiative', label: t('initiative'), icon: <Trophy size={18} />, path: '/initiative', description: t('initiative_desc') },
    { id: 'planning', label: t('planning'), icon: <BookOpen size={18} />, path: '/planning', description: t('planning_desc') },
    { id: 'development', label: t('development'), icon: <Code2 size={18} />, path: '/dev', description: t('development_desc') },
    { id: 'testing', label: t('testing'), icon: <FlaskConical size={18} />, path: '/testing', description: t('testing_desc') },
    { id: 'release', label: t('operation'), icon: <Rocket size={18} />, path: '/release', description: t('operation_desc') }
  ];

  const automationItems = [
    { id: 'triggers', label: t('triggers'), icon: <Activity size={18} />, path: '/triggers', description: t('triggers_desc') },
    { id: 'agent-config', label: t('agent_config'), icon: <Cpu size={18} />, path: '/agent-config', description: t('agent_config_desc') },
    { id: 'agent-roles', label: t('agent_roles'), icon: <Shield size={18} />, path: '/agent-roles', description: t('agent_roles_desc') }
  ];

  const viewerTheme: Record<string, { bg: string, border: string, text: string, icon: string }> = {
    repository: { bg: "bg-blue-600/5", border: "border-blue-500/20", text: "text-blue-500", icon: "text-blue-500" },
    registry: { bg: "bg-purple-600/5", border: "border-purple-500/20", text: "text-purple-500", icon: "text-purple-500" },
    documents: { bg: "bg-emerald-600/5", border: "border-emerald-500/20", text: "text-emerald-500", icon: "text-emerald-500" },
    'ai-engine': { bg: "bg-amber-600/5", border: "border-amber-500/20", text: "text-amber-500", icon: "text-amber-500" },
    cloud: { bg: "bg-emerald-600/5", border: "border-emerald-500/20", text: "text-emerald-500", icon: "text-emerald-500" }
  };

  return (
    <aside className="w-56 border-r border-border flex flex-col bg-sidebar shadow-[4px_0_24px_rgba(0,0,0,0.05)] dark:shadow-[4px_0_24px_rgba(0,0,0,0.3)] z-[100] relative font-sans text-left transition-colors duration-300">
      
      {/* 1. Brand & Project Switcher (Top - Overflow Visible) */}
      <div className="p-4 shrink-0 relative z-[110]" ref={dropdownRef}>
        <div 
          onClick={() => setIsProjectDropdownOpen(!isProjectDropdownOpen)}
          className="flex items-center space-x-2 px-2 group cursor-pointer hover:bg-foreground/5 py-2 rounded-xl transition-all"
        >
          <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white shadow-lg shadow-blue-900/40 border border-blue-400/20 group-hover:scale-110 transition-transform text-xl">
            <Bot size={20} />
          </div>
          <div className="flex flex-col flex-1 overflow-hidden text-left">
            <div className="flex items-center gap-1">
               <span className="text-sm font-bold tracking-tight text-foreground truncate">{activeProjectName}</span>
               <ChevronDown size={12} className={cn("text-muted-foreground transition-transform duration-200", isProjectDropdownOpen && "rotate-180")} />
            </div>
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold opacity-80 italic">Dev Lifecycle Manager</span>
          </div>
        </div>

        {isProjectDropdownOpen && (
          <div className="absolute top-full left-4 w-72 mt-2 bg-card border border-border rounded-2xl shadow-2xl z-[200] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 ring-4 ring-black/5 dark:ring-white/5">
            {/* Project List */}
            <div className="px-4 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest border-b border-border bg-muted/30">
              Switch Projects
            </div>
            <div className="max-h-48 overflow-y-auto py-1 custom-scrollbar">
              {projects.map((p) => (
                <div 
                  key={p.id}
                  onClick={() => {
                    if (p.is_active !== 1) onSwitchProject(p.id);
                    setIsProjectDropdownOpen(false);
                  }}
                  className={cn(
                    "px-4 py-2 text-xs flex items-center justify-between transition-colors text-left",
                    p.is_active === 1 ? "bg-blue-600/10 text-blue-500 font-bold" : "text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
                  )}
                >
                  <span className="truncate">{p.name}</span>
                  {p.is_active === 1 && <CheckCircle2 size={12} />}
                </div>
              ))}
              <button 
                onClick={() => {
                  onOpenNewProject();
                  setIsProjectDropdownOpen(false);
                }}
                className="w-full flex items-center gap-2 px-4 py-2 text-xs font-bold text-blue-500 hover:bg-muted transition-all text-left border-t border-border/50 mt-1"
              >
                <Plus size={14} />
                New Project
              </button>
              {onOpenProjectSettings && (
                <button 
                  onClick={() => {
                    onOpenProjectSettings();
                    setIsProjectDropdownOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-xs font-bold text-foreground hover:bg-muted transition-all text-left border-t border-border/50"
                >
                  <SettingsIcon size={14} className="text-muted-foreground" />
                  Workspace Properties
                </button>
              )}
            </div>

            {/* Platform Settings (Integrated) */}
            <div className="border-t border-border bg-muted/20">
               <div className="px-4 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest border-b border-border/50">
                 Platform Settings
               </div>
               <div className="p-4 space-y-4">
                  {/* Theme Toggle */}
                  <div className="space-y-2 text-left">
                     <div className="flex items-center gap-2 text-[9px] font-bold text-muted-foreground uppercase tracking-tighter">
                        <Palette size={10} />
                        Appearance
                     </div>
                     <div className="flex bg-card border border-border rounded-lg p-0.5 shadow-inner">
                        {[
                          { id: 'light', icon: <Sun size={10} /> },
                          { id: 'dark', icon: <Moon size={10} /> },
                          { id: 'system', icon: <Monitor size={10} /> }
                        ].map((mode) => (
                           <button
                             key={mode.id}
                             onClick={() => handleAppearanceChange(mode.id as any)}
                             className={cn(
                               "flex-1 flex items-center justify-center py-1 rounded-md transition-all",
                               appearance === mode.id ? "bg-blue-600 text-white shadow-sm" : "text-muted-foreground hover:text-foreground"
                             )}
                           >
                              {mode.icon}
                           </button>
                        ))}
                     </div>
                  </div>

                  {/* Language Toggle */}
                  <div className="space-y-2 text-left">
                     <div className="flex items-center gap-2 text-[9px] font-bold text-muted-foreground uppercase tracking-tighter">
                        <Globe size={10} />
                        Language
                     </div>
                     <div className="flex bg-card border border-border rounded-lg p-0.5 shadow-inner">
                        {['English', 'Japanese (日本語)'].map((lang) => (
                           <button
                             key={lang}
                             onClick={() => handleLanguageChange(lang)}
                             className={cn(
                               "flex-1 py-1 text-[8px] font-bold uppercase tracking-tighter rounded-md transition-all",
                               language === lang ? "bg-blue-600 text-white shadow-sm" : "text-muted-foreground hover:text-foreground"
                             )}
                           >
                              {lang === 'English' ? 'EN' : 'JP'}
                           </button>
                        ))}
                     </div>
                  </div>
               </div>
            </div>
          </div>
        )}
      </div>

      {/* 2. Primary Navigation (Stages) */}
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-8 custom-scrollbar">
         
         <div className="space-y-1">
            <div className="px-2 pb-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">System Stages</div>
            {phases.map((phase, i) => {
               const theme = getPhaseTheme(phase.id);
               const isActive = pathname === phase.path;
               return (
               <Link
                  key={phase.id}
                  href={phase.path}
                  onClick={(e) => handleLinkClick(phase.path, e)}
                  className={cn(
                    "flex items-center space-x-3 px-3 py-2 rounded-xl transition-all group",
                    isActive ? theme.navActive : cn("text-muted-foreground", theme.navHover)
                  )}
               >
                  <div className={cn("transition-colors", isActive ? "text-white" : cn("text-muted-foreground", theme.navHoverIcon))}>
                    {phase.icon}
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-[11px] tracking-tight">
                      <span className="font-normal opacity-60">Step {i + 1}: </span>
                      <span className="font-bold">{phase.label}</span>
                    </span>
                    <span className={cn("text-[8px] opacity-60 font-medium truncate w-24 tracking-tighter", isActive ? theme.navActiveSub : "text-muted-foreground")}>{phase.description}</span>
                  </div>
               </Link>
               );
            })}
         </div>

         {/* 3. Automation Layer */}
         <div className="space-y-1 pt-4 border-t border-border/50">
            <div className="px-2 pb-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">Automation layer</div>
            {automationItems.map((item) => (
               <Link 
                  key={item.id} 
                  href={item.path}
                  onClick={(e) => handleLinkClick(item.path, e)}
                  className={cn(
                    "flex items-center space-x-3 px-3 py-2 rounded-xl transition-all group",
                    pathname === item.path ? "bg-indigo-600 text-white shadow-lg shadow-indigo-900/20" : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
                  )}
               >
                  <div className={cn("transition-colors", pathname === item.path ? "text-white" : "text-muted-foreground group-hover:text-indigo-500")}>
                    {item.icon}
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-[11px] font-bold tracking-tight">{item.label}</span>
                    <span className={cn("text-[8px] opacity-60 font-medium truncate w-24 tracking-tighter", pathname === item.path ? "text-indigo-50" : "text-muted-foreground")}>{item.description}</span>
                  </div>
               </Link>
            ))}
         </div>

         {/* 4. Infrastructure & Knowledge (System Viewers) */}
         <div className="space-y-2 pt-4 border-t border-border/50">
            <div className="px-2 pb-1 text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">{t('viewers')}</div>
            
            {/* Repository HQ Viewer */}
            <Link 
            href="/repository"
            onClick={(e) => handleLinkClick('/repository', e)}
            className={cn(
                "border border-border rounded-xl p-1.5 flex items-center justify-between group transition-all",
                pathname === '/repository' ? cn(viewerTheme.repository.bg, viewerTheme.repository.border) : "bg-muted/40 hover:border-border hover:bg-foreground/5"
            )}
            >
            <div className="flex items-center gap-2">
                <div className={cn("p-1 bg-muted rounded-lg text-muted-foreground group-hover:text-blue-500 transition-colors border border-border shadow-sm", pathname === '/repository' && viewerTheme.repository.text)}>
                    <FolderTree size={12} />
                </div>
                <span className={cn("text-[9px] font-bold text-muted-foreground group-hover:text-foreground tracking-tight transition-colors", pathname === '/repository' && "text-foreground")}>{t('repository')}</span>
            </div>
            <div className="flex items-center gap-1.5 px-1.5 py-0.5 bg-card rounded-lg border border-border shadow-inner">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                <GitBranch size={10} className="text-muted-foreground" />
            </div>
            </Link>

            {/* Ticket Registry Viewer */}
            <Link 
            href="/registry"
            onClick={(e) => handleLinkClick('/registry', e)}
            className={cn(
                "border border-border rounded-xl p-1.5 flex items-center justify-between group transition-all",
                pathname === '/registry' ? cn(viewerTheme.registry.bg, viewerTheme.registry.border) : "bg-muted/40 hover:border-border hover:bg-foreground/5"
            )}
            >
            <div className="flex items-center gap-2 text-left">
                <div className={cn("p-1 bg-muted rounded-lg text-muted-foreground group-hover:text-purple-500 transition-colors border border-border shadow-sm", pathname === '/registry' && viewerTheme.registry.text)}>
                    <ClipboardList size={12} />
                </div>
                <span className={cn("text-[9px] font-bold text-muted-foreground group-hover:text-foreground tracking-tight transition-colors", pathname === '/registry' && "text-foreground")}>{t('tracker')}</span>
            </div>
            <div className="flex items-center gap-1.5 px-1.5 py-0.5 bg-card rounded-lg border border-border shadow-inner">
                <span className="text-[8px] font-bold text-indigo-500 font-mono">{ticketCount}</span>
            </div>
            </Link>

            {/* Documentation Vault Viewer */}
            <Link 
            href="/documents"
            onClick={(e) => handleLinkClick('/documents', e)}
            className={cn(
                "border border-border rounded-xl p-1.5 flex items-center justify-between group transition-all text-left",
                pathname === '/documents' ? cn(viewerTheme.documents.bg, viewerTheme.documents.border) : "bg-muted/40 hover:border-border hover:bg-foreground/5"
            )}
            >
            <div className="flex items-center gap-2 text-left">
                <div className={cn("p-1 bg-muted rounded-lg text-muted-foreground group-hover:text-emerald-500 transition-colors border border-border shadow-sm", pathname === '/documents' && viewerTheme.documents.text)}>
                    <ScrollText size={12} />
                </div>
                <span className={cn("text-[9px] font-bold text-muted-foreground group-hover:text-foreground tracking-tight transition-colors", pathname === '/documents' && "text-foreground")}>{t('documents')}</span>
            </div>
            <div className="flex items-center gap-1.5 px-1.5 py-0.5 bg-card rounded-lg border border-border shadow-inner text-left">
                {config?.notion_active === 'true' ? (
                    <Cloud size={10} className="text-green-600" />
                ) : (
                    <CloudOff size={10} className="text-red-500/50" />
                )}
            </div>
            </Link>

            {/* AI Engine History & Settings */}
            <Link 
            href="/ai-engine"
            onClick={(e) => handleLinkClick('/ai-engine', e)}
            className={cn(
                "border border-border rounded-xl p-1.5 flex items-center justify-between group transition-all",
                pathname === '/ai-engine' ? cn(viewerTheme['ai-engine'].bg, viewerTheme['ai-engine'].border) : "bg-muted/40 hover:border-border hover:bg-foreground/5"
            )}
            >
            <div className="flex items-center gap-2">
                <div className={cn("p-1 bg-muted rounded-lg text-muted-foreground group-hover:text-amber-500 transition-colors border border-border shadow-sm", pathname === '/ai-engine' && viewerTheme['ai-engine'].text)}>
                    <Zap size={12} />
                </div>
                <span className={cn("text-[9px] font-bold text-muted-foreground group-hover:text-foreground tracking-tight transition-colors", pathname === '/ai-engine' && "text-foreground")}>{t('ai_engine')}</span>
            </div>
            <div className="flex items-center gap-1.5 px-1.5 py-0.5 bg-card rounded-lg border border-border shadow-inner">
                <Monitor size={10} className={cn(config?.ollama_host ? "text-green-500" : "text-red-500")} />
                <div className="w-px h-2 bg-border" />
                {config?.anthropic_api_key || config?.google_api_key || config?.ollama_host ? (
                    <Cloud size={10} className="text-green-600" />
                ) : (
                    <CloudOff size={10} className="text-red-500/50" />
                )}
            </div>
            </Link>

            {/* Cloud Platform Viewer */}
            <Link 
            href="/cloud"
            onClick={(e) => handleLinkClick('/cloud', e)}
            className={cn(
                "border border-border rounded-xl p-1.5 flex items-center justify-between group transition-all text-left",
                pathname === '/cloud' ? cn(viewerTheme.cloud.bg, viewerTheme.cloud.border) : "bg-muted/40 hover:border-border hover:bg-foreground/5"
            )}
            >
            <div className="flex items-center gap-2 text-left">
                <div className={cn("p-1 bg-muted rounded-lg text-muted-foreground group-hover:text-emerald-500 transition-colors border border-border shadow-sm", pathname === '/cloud' && viewerTheme.cloud.text)}>
                    <CloudLightning size={12} />
                </div>
                <span className={cn("text-[9px] font-bold text-muted-foreground group-hover:text-foreground tracking-tight transition-colors", pathname === '/cloud' && "text-foreground")}>{t('cloud')}</span>
            </div>
            <div className="flex items-center gap-1.5 px-1.5 py-0.5 bg-card rounded-lg border border-border shadow-inner">
                {config?.cloud_active === 'true' ? (
                    <Cloud size={10} className="text-green-600" />
                ) : (
                    <CloudOff size={10} className="text-red-500/50" />
                )}
            </div>
            </Link>
        </div>
      </div>

      {/* Feedback button */}
      <div className="px-4 py-3 border-t border-border/50 shrink-0">
        <button
          onClick={() => setFeedbackOpen(true)}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-all group text-left"
        >
          <MessageSquare size={14} className="shrink-0 group-hover:text-blue-500 transition-colors" />
          <span className="text-[10px] font-bold uppercase tracking-widest">Report / Suggest</span>
        </button>
      </div>

      <FeedbackModal isOpen={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
    </aside>
  );
}

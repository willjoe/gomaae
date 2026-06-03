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
  Database
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useLifecycle } from '@/context/LifecycleContext';
import { lifecycleTheme, viewerTheme } from '@/lib/theme';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

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
  activePath?: string;
  onNavigate?: (path: string) => void;
}

export default function Sidebar({ config, activeProjectName, projects, onSwitchProject, onOpenNewProject, activePath, onNavigate }: SidebarProps) {
  const currentPathname = usePathname();
  const pathname = activePath || currentPathname;
  const { t, language, updateLanguage, appearance, updateAppearance, environment, updateEnvironment } = useLifecycle();
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);
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
    { id: 'planning', label: t('planning'), icon: <BookOpen size={18} />, path: '/', description: t('planning_desc') },
    { id: 'development', label: t('development'), icon: <Code2 size={18} />, path: '/dev', description: t('development_desc') },
    { id: 'testing', label: t('testing'), icon: <FlaskConical size={18} />, path: '/testing', description: t('testing_desc') },
    { id: 'release', label: t('operation'), icon: <Rocket size={18} />, path: '/release', description: t('operation_desc') }
  ];

  const automationItems = [
    { id: 'triggers', label: t('triggers'), icon: <Activity size={18} />, path: '/triggers', description: t('triggers_desc') },
    { id: 'agent-config', label: t('agent_config'), icon: <Cpu size={18} />, path: '/agent-config', description: t('agent_config_desc') }
  ];

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
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold opacity-80 italic">Profile Registry</span>
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
            </div>

            {/* Platform Settings (Integrated) */}
            <div className="border-t border-border bg-muted/20">
               <div className="px-4 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest border-b border-border/50">
                 Platform Settings
               </div>
               <div className="p-4 space-y-4">
                  {/* Environment Selector */}
                  <div className="space-y-2">
                     <div className="flex items-center gap-2 text-[9px] font-bold text-muted-foreground uppercase tracking-tighter">
                        <Database size={10} />
                        Environment
                     </div>
                     <select 
                       value={environment}
                       onChange={(e) => updateEnvironment(e.target.value as 'dev' | 'prod')}
                       className="w-full bg-card border border-border rounded-lg px-2 py-1.5 text-[11px] text-foreground outline-none focus:ring-1 focus:ring-blue-500/50 font-bold italic appearance-none cursor-pointer"
                     >
                        <option value="dev">Development (Mocked)</option>
                        <option value="prod">Production (Clean)</option>
                     </select>
                  </div>

                  {/* Theme Toggle */}
                  <div className="space-y-2">
                     <div className="flex items-center gap-2 text-[9px] font-bold text-muted-foreground uppercase tracking-tighter">
                        <Palette size={10} />
                        Appearance
                     </div>
                     <div className="flex items-center gap-1 bg-card border border-border rounded-lg p-0.5 shadow-inner">
                        {[
                          { id: 'light', icon: <Sun size={12} /> },
                          { id: 'dark', icon: <Moon size={12} /> },
                          { id: 'system', icon: <Monitor size={12} /> }
                        ].map(opt => (
                          <button 
                            key={opt.id}
                            onClick={() => handleAppearanceChange(opt.id as any)}
                            className={cn(
                              "flex-1 flex items-center justify-center p-1.5 rounded-md transition-all",
                              appearance === opt.id ? "bg-blue-600 text-white shadow-md" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                            )}
                          >
                            {opt.icon}
                          </button>
                        ))}
                     </div>
                  </div>

                  {/* Language Selector */}
                  <div className="space-y-2">
                     <div className="flex items-center gap-2 text-[9px] font-bold text-muted-foreground uppercase tracking-tighter">
                        <Globe size={10} />
                        Localization
                     </div>
                     <select 
                       value={language}
                       onChange={(e) => handleLanguageChange(e.target.value)}
                       className="w-full bg-card border border-border rounded-lg px-2 py-1.5 text-[11px] text-foreground outline-none focus:ring-1 focus:ring-blue-500/50 font-bold italic appearance-none cursor-pointer"
                     >
                        <option>English</option>
                        <option>Japanese (日本語)</option>
                        <option>French (Français)</option>
                     </select>
                  </div>
               </div>
            </div>
          </div>
        )}
      </div>

      {/* 2. Scrollable Navigation Content */}
      <div className="flex-1 overflow-y-auto px-4 pb-8 space-y-6 custom-scrollbar">
        {/* Development Stages */}
        <nav className="space-y-1 text-xs shrink-0">
            <div className="text-[10px] text-muted-foreground uppercase font-bold px-3 mb-2 tracking-widest opacity-60">{t('stages')}</div>
            {phases.map((phase) => {
            const isActive = pathname === phase.path;
            const theme = lifecycleTheme[phase.id] || lifecycleTheme.initiative;
            
            return (
                <Link 
                key={phase.id} 
                href={phase.path}
                onClick={(e) => handleLinkClick(phase.path, e)}
                className={cn(
                    "group flex flex-col px-3 py-2 rounded-lg transition-all border border-transparent",
                    isActive ? cn(theme.bg, theme.border, theme.text) : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
                >
                <div className="flex items-center space-x-3 text-left">
                    <span className={cn(theme.icon, !isActive && "opacity-70 group-hover:opacity-100")}>
                    {phase.icon}
                    </span>
                    <span className="text-sm font-semibold">{phase.label}</span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1 ml-7 group-hover:text-foreground/70 line-clamp-1 italic text-left">
                    {phase.description}
                </p>
                </Link>
            );
            })}
        </nav>

        {/* Automation Section */}
        <nav className="space-y-1 text-xs shrink-0 pt-2 border-t border-border/40">
            <div className="text-[10px] text-indigo-500 dark:text-indigo-400 uppercase font-bold px-3 mb-2 tracking-widest opacity-90 flex items-center gap-2 italic">
            <Unplug size={12} />
            {t('automation')}
            </div>
            {automationItems.map((item) => {
            const isActive = pathname === item.path;
            return (
                <Link 
                key={item.id} 
                href={item.path}
                onClick={(e) => handleLinkClick(item.path, e)}
                className={cn(
                    "group flex flex-col px-3 py-2 rounded-lg transition-all border border-transparent",
                    isActive ? "bg-indigo-600/10 border-indigo-500/30 text-indigo-500 font-bold" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
                >
                <div className="flex items-center space-x-3 text-left">
                    <span className={cn(isActive ? "text-indigo-500" : "opacity-70 group-hover:opacity-100")}>
                    {item.icon}
                    </span>
                    <span className="text-sm font-semibold">{item.label}</span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1 ml-7 group-hover:text-foreground/70 line-clamp-1 italic text-left">
                    {item.description}
                </p>
                </Link>
            );
            })}
        </nav>

        {/* System Viewers / Registries */}
        <div className="space-y-1 pt-4 border-t border-border shrink-0">
            <div className="text-[10px] text-muted-foreground uppercase font-bold px-2 mb-1 tracking-widest opacity-60">{t('viewers')}</div>
            
            {/* Repository Viewer */}
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
                <Monitor size={10} className="text-green-500" />
                <div className="w-px h-2 bg-border" />
                {config?.repo_url ? (
                    <Cloud size={10} className="text-green-600" />
                ) : (
                    <CloudOff size={10} className="text-red-500/50" />
                )}
            </div>
            </Link>

            {/* Ticket Manager Registry */}
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
                    <TicketIcon size={12} />
                </div>
                <span className={cn("text-[9px] font-bold text-muted-foreground group-hover:text-foreground tracking-tight transition-colors", pathname === '/registry' && "text-foreground")}>{t('tracker')}</span>
            </div>
            <div className="flex items-center gap-1.5 px-1.5 py-0.5 bg-card rounded-lg border border-border shadow-inner">
                <Monitor size={10} className="text-green-500" />
                <div className="w-px h-2 bg-border" />
                {config?.linear_api_key ? (
                    <Cloud size={10} className="text-green-600" />
                ) : (
                    <CloudOff size={10} className="text-red-500/50" />
                )}
            </div>
            </Link>

            {/* Documentation Library */}
            <Link 
            href="/documents"
            onClick={(e) => handleLinkClick('/documents', e)}
            className={cn(
                "border border-border rounded-xl p-1.5 flex items-center justify-between group transition-all",
                pathname === '/documents' ? cn(viewerTheme.documents.bg, viewerTheme.documents.border) : "bg-muted/40 hover:border-border hover:bg-foreground/5"
            )}
            >
            <div className="flex items-center gap-2">
                <div className={cn("p-1 bg-muted rounded-lg text-muted-foreground group-hover:text-foreground transition-colors border border-border shadow-sm", pathname === '/documents' && viewerTheme.documents.text)}>
                    <ScrollText size={12} />
                </div>
                <span className={cn("text-[9px] font-bold text-muted-foreground group-hover:text-foreground tracking-tight transition-colors", pathname === '/documents' && "text-foreground")}>{t('documents')}</span>
            </div>
            <div className="flex items-center gap-1.5 px-1.5 py-0.5 bg-card rounded-lg border border-border shadow-inner">
                <Monitor size={10} className="text-green-500" />
                <div className="w-px h-2 bg-border" />
                {(config?.notion_api_key || (config?.repo_sync_active === 'true' && config?.repo_url)) ? (
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
    </aside>
  );
}

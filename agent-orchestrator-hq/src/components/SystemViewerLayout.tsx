'use client';

import React from 'react';
import SidebarConnectionWizard from './SidebarConnectionWizard';
import TacticalCommandChat from './TacticalCommandChat';
import { useLifecycle } from '@/context/LifecycleContext';
import { viewerTheme } from '@/lib/theme';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface SystemViewerLayoutProps {
  id: string;
  title: string;
  description: string;
  wizardType: 'repo' | 'tracker' | 'docs' | 'ai' | 'cloud';
  children: React.ReactNode;
  sidebarContent?: React.ReactNode;
}

export default function SystemViewerLayout({
  id,
  title,
  description,
  wizardType,
  children,
  sidebarContent
}: SystemViewerLayoutProps) {
  const { t } = useLifecycle();
  const theme = viewerTheme[id] || viewerTheme.repository;

  return (
    <div className="flex h-full overflow-hidden font-sans text-left">
      {/* Main Content Pane */}
      <div className="flex-1 overflow-y-auto custom-scrollbar relative">
        <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-md px-8 py-8 border-b border-border flex justify-between items-center transition-colors duration-300">
          <div>
            <h1 className={cn("text-3xl font-bold italic tracking-tight underline underline-offset-8 decoration-4", theme.text, theme.decoration)}>
              {title}
            </h1>
            <p className="text-muted-foreground mt-2 text-sm italic uppercase tracking-widest font-bold opacity-60">
              {description}
            </p>
          </div>
        </header>

        <div className="p-8 space-y-8 animate-in fade-in duration-500">
           {children}
        </div>
      </div>

      {/* Right Registry Sidebar */}
      <div className="w-[300px] p-8 border-l border-border bg-muted/10 shrink-0 h-full flex flex-col space-y-8 relative">
         <div className="flex-1 space-y-8 overflow-y-auto pr-1 custom-scrollbar">
            <SidebarConnectionWizard type={wizardType} onConnect={() => {}} />
            {sidebarContent}
         </div>
         
         <div className="shrink-0 mt-auto pt-8">
            <TacticalCommandChat phaseId={id} />
         </div>
      </div>
    </div>
  );
}

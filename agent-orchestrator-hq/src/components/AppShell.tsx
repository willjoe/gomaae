'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import ProjectModal from './ProjectModal';
import { LifecycleProvider, useLifecycle } from '@/context/LifecycleContext';

function ThemeManager({ children }: { children: React.ReactNode }) {
  const { appearance } = useLifecycle();

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');

    if (appearance === 'system') {
      // System preference is handled by media queries in CSS unless we explicitly add classes
      // But to be safe and consistent with manual overrides:
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      // In Tailwind v4, media queries handle system, but we might want to know for other logic
    } else {
      root.classList.add(appearance);
    }
  }, [appearance]);

  return <>{children}</>;
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [activeProject, setActiveProject] = useState<any>(null);
  const [isProjModalOpen, setIsProjModalOpen] = useState(false);

  useEffect(() => {
    fetchConfig();
    fetchProjects();
  }, []);

  const fetchConfig = async () => {
    try {
      const res = await fetch('/api/config');
      const data = await res.json();
      if (data.success) setConfig(data.config);
    } catch (err) {
      console.error('Shell failed to fetch config:', err);
    }
  };

  const fetchProjects = async () => {
    try {
      const res = await fetch('/api/projects');
      const data = await res.json();
      if (data.success) {
        setProjects(data.projects);
        const active = data.projects.find((p: any) => p.is_active === 1);
        setActiveProject(active);

        // Auto-trigger initialization if no project exists or active project lacks paths
        if (data.projects.length === 0 || (active && (!active.repo_path || !active.docs_path))) {
          setIsProjModalOpen(true);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSwitchProject = async (projectId: string) => {
    try {
      const res = await fetch('/api/projects/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId })
      });
      if ((await res.json()).success) {
        window.location.reload();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <LifecycleProvider>
      <ThemeManager>
        <div className="flex h-screen bg-background text-foreground overflow-hidden font-sans transition-colors duration-300">
          <Sidebar 
            config={config} 
            activeProjectName={activeProject?.name || 'Agentic Engineering HQ'}
            projects={projects}
            onSwitchProject={handleSwitchProject}
            onOpenNewProject={() => setIsProjModalOpen(true)}
          />
          <main className="flex-1 flex flex-col h-full overflow-hidden">
            {children}
          </main>

          <ProjectModal 
            isOpen={isProjModalOpen} 
            onClose={() => setIsProjModalOpen(false)} 
            onProjectCreated={() => fetchProjects()}
          />
        </div>
      </ThemeManager>
    </LifecycleProvider>
  );
}

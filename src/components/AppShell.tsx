'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import ProjectModal from './ProjectModal';
import UpdateBanner from './UpdateBanner';
import { LifecycleProvider, useLifecycle } from '@/context/LifecycleContext';
import { bootBus } from '@/lib/bootBus';

function ThemeManager({ children }: { children: React.ReactNode }) {
  const { appearance } = useLifecycle();
  
  useEffect(() => {
    const root = window.document.documentElement;
    const mql = window.matchMedia('(prefers-color-scheme: dark)');

    const apply = () => {
      root.classList.remove('light', 'dark');
      root.classList.add(appearance === 'system' ? (mql.matches ? 'dark' : 'light') : appearance);
    };

    apply();

    // In System mode, follow the OS live (e.g. auto dark at sunset).
    if (appearance === 'system') {
      mql.addEventListener('change', apply);
      return () => mql.removeEventListener('change', apply);
    }
  }, [appearance]);

  return <>{children}</>;
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [activeProject, setActiveProject] = useState<any>(null);
  const [isProjModalOpen, setIsProjModalOpen] = useState(false);
  const [projectToEdit, setProjectToEdit] = useState<any>(null);

  useEffect(() => {
    Promise.all([fetchConfig(), fetchProjects()]).then(() => {
      bootBus.emit('boot:ready');
      // Low-priority background tasks run here — after the two critical boot fetches settle.
      fetch('/api/ai/dry-run', { method: 'POST' }).catch(() => {});
    });
  }, []);

  const fetchConfig = async (): Promise<void> => {
    try {
      const res = await fetch('/api/config');
      const data = await res.json();
      if (data.success) setConfig(data.config);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchProjects = async (): Promise<void> => {
    try {
      const res = await fetch('/api/projects');
      const data = await res.json();
      if (data.success) {
        setProjects(data.projects);
        const active = data.projects.find((p: any) => p.is_active === 1);
        setActiveProject(active);

        // Auto-trigger initialization if no project exists OR if active is missing paths
        if (data.projects.length === 0 || !active || !active.workspace_root) {
          setProjectToEdit(null);
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
            activeProjectName={activeProject?.name || 'Select Project'}
            projects={projects}
            onSwitchProject={handleSwitchProject}
            onOpenNewProject={() => {
              setProjectToEdit(null);
              setIsProjModalOpen(true);
            }}
            onOpenProjectSettings={() => {
              setProjectToEdit(activeProject);
              setIsProjModalOpen(true);
            }}
          />
          <main className="flex-1 flex flex-col h-full overflow-hidden">
            {children}
          </main>

          <ProjectModal
            isOpen={isProjModalOpen}
            onClose={() => setIsProjModalOpen(false)}
            onProjectCreated={() => fetchProjects()}
            editProject={projectToEdit}
          />
          <UpdateBanner />
        </div>
      </ThemeManager>
    </LifecycleProvider>
  );
}

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
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      root.classList.add(systemTheme);
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
  const [projectToEdit, setProjectToEdit] = useState<any>(null);

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
      console.error(err);
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
        </div>
      </ThemeManager>
    </LifecycleProvider>
  );
}

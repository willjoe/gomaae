'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import ProjectModal from './ProjectModal';
import { LifecycleProvider } from '@/context/LifecycleContext';

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
      <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
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
    </LifecycleProvider>
  );
}

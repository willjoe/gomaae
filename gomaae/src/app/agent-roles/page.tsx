'use client';

import React, { useState, useEffect } from 'react';
import { Shield, Lock, BookOpen, Bot, GitBranch, Cpu, Activity, CircleDashed, FileJson, X, Brain } from 'lucide-react';
import { cn } from '@/lib/cn';
import { getPhaseTheme } from '@/lib/phaseConfig';
import { ORG_DATA, type OrgNode } from '@/lib/agentRoles';

interface DbRole { id: string; name: string; description: string; personality_vector: string | null; }

export default function AgentRolesPage() {
  const [selectedNode, setSelectedNode] = useState<OrgNode | null>(null);
  const [dbRole, setDbRole] = useState<DbRole | null>(null);
  const [pvDraft, setPvDraft] = useState('');
  const [pvSaving, setPvSaving] = useState(false);

  useEffect(() => {
    if (!selectedNode) { setDbRole(null); setPvDraft(''); return; }
    fetch('/api/roles')
      .then(r => r.json())
      .then(d => {
        const found = (d.roles ?? []).find((r: DbRole) => r.name === selectedNode.name) ?? null;
        setDbRole(found);
        setPvDraft(found?.personality_vector ?? '');
      })
      .catch(() => { setDbRole(null); setPvDraft(''); });
  }, [selectedNode]);

  const savePersonalityVector = async () => {
    if (!selectedNode) return;
    setPvSaving(true);
    try {
      if (dbRole) {
        await fetch('/api/roles', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: dbRole.id, personality_vector: pvDraft || null }),
        });
      } else {
        const res = await fetch('/api/roles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: selectedNode.name, description: '', personality_vector: pvDraft || null }),
        });
        const d = await res.json();
        if (d.role) setDbRole(d.role);
      }
    } finally {
      setPvSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden relative">
      {/* Header */}
      <div className="flex flex-col space-y-2 p-8 pb-4 shrink-0 border-b border-border bg-card/50 z-10">
        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Shield className="text-blue-500" />
          Agent Roles & Organization
        </h1>
        <p className="text-muted-foreground max-w-2xl">
          Manage AI Agent Roles, permissions, context boundaries, and artifact deliverables.
          Select an active role from the registry to view or modify its configuration.
        </p>
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Panel: Org Chart (Takes full width if no selection) */}
        <div className="flex-1 overflow-auto custom-scrollbar bg-[#f8f9fa] dark:bg-[#09090b] relative transition-all duration-300">
          
          {/* Org Chart Canvas (Left-to-Right) */}
          <div className="p-12 min-w-max flex items-center select-none pr-32">

            {/* Root Junction (replaces the orchestrator card) */}
            <div className="w-3 h-3 rounded-sm bg-muted border border-border shadow-sm z-10 shrink-0" title={ORG_DATA.name}></div>

            {/* Connection from Root Junction to Departments Trunk */}
            <div className="h-px w-10 bg-border/80 shrink-0"></div>

            {/* Departments Column */}
            <div className="flex flex-col gap-8 relative shrink-0">

              {ORG_DATA.children?.map((dept, deptIdx, depts) => {
                const isFirstDept = deptIdx === 0;
                const isLastDept = deptIdx === depts.length - 1;
                return (
                  <div key={dept.id} className="flex items-center relative">

                    {/* Vertical trunk segment (spans first dept center -> last dept center) */}
                    <div className={cn(
                      "absolute left-0 w-px bg-border/80",
                      isFirstDept ? "top-1/2" : "-top-4",
                      isLastDept ? "bottom-1/2" : "-bottom-4"
                    )}></div>

                    {/* Horizontal line from trunk to department node */}
                    <div className="h-px w-6 bg-border/80 shrink-0"></div>

                    {/* Department Node */}
                    <div className="bg-muted/50 border border-border/60 rounded-lg p-3 w-48 text-center z-10 shadow-sm backdrop-blur-sm shrink-0">
                      <h4 className="font-bold text-xs text-foreground uppercase tracking-tight">{dept.name}</h4>
                    </div>

                    {/* Horizontal line from department node to roles */}
                    <div className="h-px w-6 bg-border/80 shrink-0"></div>

                    {/* Roles Row (level 3, lined horizontally) */}
                    <div className="flex items-center relative shrink-0">

                        {dept.children?.map((role, roleIdx) => {
                          const lifecycle = role.lifecycle ?? dept.lifecycle ?? 'planning';
                          const theme = getPhaseTheme(lifecycle);
                          const isSelected = selectedNode?.id === role.id;
                          return (
                          <React.Fragment key={role.id}>

                            {/* Horizontal connector line between role cards */}
                            {roleIdx > 0 && <div className="h-px w-4 bg-border/60 shrink-0"></div>}

                            <div
                              onClick={() => role.isActive && setSelectedNode({ ...role, lifecycle })}
                              className={cn(
                                "w-56 bg-card border rounded-lg p-3 z-10 flex items-center gap-3 transition-all shrink-0",
                                role.isActive
                                  ? cn("cursor-pointer", theme.border, theme.hoverBorder, "hover:shadow-md hover:-translate-y-0.5")
                                  : "cursor-not-allowed border-dashed border-border/50 opacity-60 grayscale",
                                isSelected && cn("ring-2 border-transparent shadow-lg -translate-y-1", theme.ring)
                              )}
                            >
                              <div className={cn("p-1.5 rounded-md shrink-0 transition-colors", role.isActive ? theme.iconBox : "bg-muted text-muted-foreground", isSelected && theme.solidIcon)}>
                                  {role.isActive ? <Bot size={16} /> : <CircleDashed size={16} />}
                              </div>
                              <div className="flex flex-col text-left overflow-hidden gap-1">
                                <span className={cn("text-xs font-bold leading-tight truncate transition-colors", role.isActive ? "text-foreground" : "text-muted-foreground", isSelected && theme.selectedText)}>
                                  {role.name}
                                </span>
                                <div className="flex items-center gap-1.5">
                                  <span className={cn("text-[8px] font-bold uppercase tracking-wider px-1.5 py-px rounded border leading-none", theme.badge)}>
                                    {theme.label}
                                  </span>
                                  {!role.isActive && (
                                    <span className="text-[8px] uppercase tracking-wider text-muted-foreground font-medium">Planned</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </React.Fragment>
                          );
                        })}
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        </div>

        {/* Right Panel: Role Configuration Details */}
        {selectedNode && (
           <div className="w-[400px] shrink-0 border-l border-border bg-card shadow-[-8px_0_32px_rgba(0,0,0,0.05)] overflow-y-auto custom-scrollbar relative animate-in slide-in-from-right-16 duration-300">
             
             {/* Sticky Panel Header */}
             <div className="sticky top-0 bg-card/80 backdrop-blur-md z-20 border-b border-border p-5 flex items-center justify-between">
                <h3 className="font-bold text-foreground tracking-tight">Role Configuration</h3>
                <button 
                  onClick={() => setSelectedNode(null)} 
                  className="p-1.5 hover:bg-muted rounded-full text-muted-foreground hover:text-foreground transition-colors"
                  title="Close Details"
                >
                  <X size={18} />
                </button>
             </div>
             
             <div className="p-6 space-y-6">
                
                {/* Role Header Info */}
                <div className="flex items-center gap-3">
                  <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shadow-md border border-white/10 shrink-0", getPhaseTheme(selectedNode.lifecycle ?? 'planning').solidIcon)}>
                    <Bot size={26} />
                  </div>
                  <div className="overflow-hidden">
                    <h2 className="text-xl font-bold tracking-tight leading-tight truncate">{selectedNode.name}</h2>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="px-1.5 py-0.5 bg-blue-500/10 text-blue-500 text-[10px] font-bold rounded uppercase tracking-wider">Active</span>
                      <span className="text-xs text-muted-foreground font-mono truncate">{selectedNode.id}</span>
                    </div>
                  </div>
                </div>

                <button className="w-full py-2.5 bg-foreground text-background font-bold text-sm rounded-lg hover:opacity-90 transition-opacity">
                  Edit Identity & Settings
                </button>

                {/* Configuration Blocks */}
                <div className="space-y-4">
                  
                  {/* Permissions */}
                  <div className="p-4 bg-muted/30 border border-border rounded-xl">
                    <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground mb-4 uppercase tracking-wider">
                       <Lock size={14} /> Base Permissions
                    </div>
                    <div className="space-y-3">
                       <div className="flex justify-between items-center text-sm border-b border-border/50 pb-2">
                          <span className="text-foreground/80 font-medium">Read Scope</span>
                          <span className="font-mono text-[10px] bg-card border border-border px-1.5 py-0.5 rounded shadow-sm">repo:read</span>
                       </div>
                       <div className="flex justify-between items-center text-sm border-b border-border/50 pb-2">
                          <span className="text-foreground/80 font-medium">Write Scope</span>
                          <span className="font-mono text-[10px] bg-card border border-border px-1.5 py-0.5 rounded shadow-sm">repo:write</span>
                       </div>
                       <div className="flex justify-between items-center text-sm">
                          <span className="text-foreground/80 font-medium">Execute Scope</span>
                          <span className="font-mono text-[10px] bg-card border border-border px-1.5 py-0.5 rounded shadow-sm">sandbox:run</span>
                       </div>
                    </div>
                  </div>

                  {/* Deliverables */}
                  <div className="p-4 bg-muted/30 border border-border rounded-xl">
                    <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground mb-4 uppercase tracking-wider">
                       <BookOpen size={14} /> Ownership Deliverables
                    </div>
                    <div className="space-y-3">
                       <div className="flex items-center gap-3 text-sm text-foreground/80">
                          <div className="p-1.5 bg-blue-500/10 rounded-md"><FileJson size={14} className="text-blue-500" /></div>
                          <span className="font-medium">[Specification] Docs</span>
                       </div>
                       <div className="flex items-center gap-3 text-sm text-foreground/80">
                          <div className="p-1.5 bg-emerald-500/10 rounded-md"><Activity size={14} className="text-emerald-500" /></div>
                          <span className="font-medium">[TDD] Test Assets</span>
                       </div>
                       <div className="flex items-center gap-3 text-sm text-foreground/80">
                          <div className="p-1.5 bg-purple-500/10 rounded-md"><GitBranch size={14} className="text-purple-500" /></div>
                          <span className="font-medium">Source Code & Commits</span>
                       </div>
                    </div>
                  </div>

                  {/* Context Vector */}
                  <div className="p-4 bg-muted/30 border border-border rounded-xl">
                     <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground mb-3 uppercase tracking-wider">
                         <Cpu size={14} /> Context Vector (.json)
                      </div>
                      <div className="bg-zinc-950 p-4 rounded-lg border border-border/50 overflow-x-auto shadow-inner">
                        <pre className="text-[11px] leading-relaxed font-mono text-zinc-300">
{`{
  "role": "${selectedNode.id}",
  "capabilities": [
    "code_generation",
    "test_execution",
    "pr_review"
  ],
  "knowledge_paths": [
    "DocsAssets/Domains",
    "agent-roles/roles"
  ],
  "default_model": "claude-3.5-sonnet",
  "temperature": 0.2
}`}
                        </pre>
                      </div>
                  </div>

                  {/* Personality Vector */}
                  <div className="p-4 bg-muted/30 border border-border rounded-xl">
                    <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground mb-3 uppercase tracking-wider">
                      <Brain size={14} /> Personality Vector
                    </div>
                    <p className="text-[11px] text-muted-foreground/70 mb-3 leading-relaxed">
                      Define the agent's behavioral identity, tone, and decision-making style. Applied to every prompt this role receives.
                    </p>
                    <textarea
                      className="w-full min-h-[120px] bg-zinc-950 border border-border/50 rounded-lg px-3 py-2.5 text-[11px] font-mono text-zinc-300 placeholder-zinc-600 resize-y focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/50 transition-colors"
                      placeholder={`e.g. You are a meticulous senior engineer who prioritises correctness over speed. You think in systems, prefer explicit over implicit, and always add tests before closing a ticket.`}
                      value={pvDraft}
                      onChange={e => setPvDraft(e.target.value)}
                      onBlur={savePersonalityVector}
                    />
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[10px] text-muted-foreground/50">
                        {dbRole ? 'Saved to DB' : 'Not yet saved — blur or click Save'}
                      </span>
                      <button
                        onClick={savePersonalityVector}
                        disabled={pvSaving}
                        className="text-[11px] px-3 py-1 bg-blue-500/10 text-blue-500 border border-blue-500/20 rounded-md hover:bg-blue-500/20 transition-colors disabled:opacity-50"
                      >
                        {pvSaving ? 'Saving…' : 'Save'}
                      </button>
                    </div>
                  </div>
                </div>
                
             </div>
           </div>
        )}
      </div>
    </div>
  );
}

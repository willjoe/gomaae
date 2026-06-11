'use client';

import React, { useEffect, useRef, useState } from 'react';
import cytoscape from 'cytoscape';
import { Lightbulb, ChevronDown, Loader2, RotateCcw, ArrowDown, Maximize2, Minimize2, Trophy, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/cn';

// Light node colours so black node labels read clearly; clusters map to the pillars.
const CATEGORY_COLORS: Record<string, string> = {
  Problem: '#fca5a5',
  Market: '#93c5fd',
  Persona: '#d8b4fe',
  UVP: '#86efac',
  Entry: '#fcd34d',
  Feasibility: '#67e8f9',
  ROI: '#6ee7b7',
  Other: '#cbd5e1',
};

interface GNode { id: string; title: string; category: string }
interface GEdge { id: string; from_id: string; to_id: string; relationship_type: string }

export default function BrainstormSandbox({
  onAddToStrategic,
  onAddToDelegation,
}: {
  onAddToStrategic: (pillars: Record<string, string>) => void;
  onAddToDelegation: (delegation: any) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [text, setText] = useState('');
  const [nodes, setNodes] = useState<GNode[]>([]);
  const [edges, setEdges] = useState<GEdge[]>([]);
  const [summary, setSummary] = useState('');
  const [pillars, setPillars] = useState<Record<string, string>>({});
  const [delegation, setDelegation] = useState<any>({});
  const [queue, setQueue] = useState<{ id: string; text: string }[]>([]);
  const [synthesizing, setSynthesizing] = useState(false);
  const [synthExpanded, setSynthExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);
  const queueProcessing = useRef(false);
  const graphDirty = useRef(false);

  // Load any saved graph + synthesis for this workstation.
  useEffect(() => {
    fetch('/api/brainstorm')
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setNodes(d.nodes || []);
          setEdges(d.edges || []);
          setSummary(d.summary || '');
          setPillars(d.pillars || {});
          setDelegation(d.delegation || {});
        }
      })
      .catch(() => {});
  }, []);

  // Build / refresh the Cytoscape graph.
  useEffect(() => {
    if (collapsed) {
      cyRef.current?.destroy();
      cyRef.current = null;
      return;
    }
    if (!containerRef.current) return;

    try {
    if (!cyRef.current) {
      const cy = cytoscape({
        container: containerRef.current,
        wheelSensitivity: 0.2,
        style: [
          {
            selector: 'node',
            style: {
              // Rounded-rectangle pill that auto-sizes to its label (text sits inside).
              shape: 'round-rectangle',
              'background-color': 'data(color)',
              'border-width': 1.5,
              'border-color': '#64748b',
              width: 'label',
              height: 'label',
              padding: '8px',
              label: 'data(label)',
              color: '#0f172a',
              'font-size': '10px',
              'font-weight': 'normal',
              'text-valign': 'center',
              'text-halign': 'center',
              'text-wrap': 'wrap',
              'text-max-width': '130px',
            },
          },
          {
            selector: 'edge',
            style: {
              width: 1.5,
              'line-color': '#cbd5e1',
              'target-arrow-color': '#cbd5e1',
              'target-arrow-shape': 'triangle',
              'arrow-scale': 0.8,
              'curve-style': 'bezier',
              label: 'data(label)',
              'font-size': '8px',
              color: '#64748b',
              'text-rotation': 'autorotate',
              'text-margin-y': -6,
              'text-background-color': '#ffffff',
              'text-background-opacity': 0.85,
              'text-background-shape': 'roundrectangle',
              'text-background-padding': '1px',
            },
          },
          // Hover focus: dim everything except the hovered concept's neighborhood so its
          // text (and its relationships) stands out of a dense graph.
          { selector: '.faded', style: { opacity: 0.12, 'text-opacity': 0.05 } },
          { selector: 'node.focus', style: { 'border-width': 3, 'border-color': '#334155' } },
          { selector: 'edge.focus', style: { width: 3, 'line-color': '#475569', 'target-arrow-color': '#475569', color: '#0f172a', 'z-index': 999 } },
        ],
      });

      const clearFocus = () => cy.elements().removeClass('faded focus');
      cy.on('mouseover', 'node', (e: any) => {
        cy.elements().addClass('faded');
        e.target.closedNeighborhood().removeClass('faded').addClass('focus');
      });
      cy.on('mouseover', 'edge', (e: any) => {
        cy.elements().addClass('faded');
        e.target.connectedNodes().add(e.target).removeClass('faded').addClass('focus');
      });
      cy.on('mouseout', 'node', clearFocus);
      cy.on('mouseout', 'edge', clearFocus);

      cyRef.current = cy;
    }

    const cy = cyRef.current;
    const ids = new Set(nodes.map((n) => n.id));
    const els: cytoscape.ElementDefinition[] = [
      ...nodes.map((n) => ({ data: { id: n.id, label: n.title, color: CATEGORY_COLORS[n.category] || CATEGORY_COLORS.Other } })),
      ...edges
        .filter((e) => ids.has(e.from_id) && ids.has(e.to_id))
        .map((e) => ({ data: { id: e.id, source: e.from_id, target: e.to_id, label: e.relationship_type } })),
    ];
    cy.elements().remove();
    cy.add(els);
    cy.resize();
    // Synchronous layout (animate:false) so node positions are final BEFORE we fit —
    // an animated/async layout fits the pre-layout positions and pans everything off-screen.
    // Lay out within a box matching the (wide) canvas aspect so the graph spreads
    // horizontally instead of stacking vertically.
    const bbW = containerRef.current?.clientWidth || 900;
    const bbH = containerRef.current?.clientHeight || 480;
    cy.layout({
      name: els.length > 1 ? 'cose' : 'grid',
      animate: false,
      fit: true,
      padding: 40,
      boundingBox: { x1: 0, y1: 0, w: bbW, h: bbH },
      nodeRepulsion: 16000,
      idealEdgeLength: 150,
      nodeOverlap: 28,
      componentSpacing: 140,
      gravity: 0.15,
      numIter: 1500,
    } as any).run();
    cy.resize();
    cy.fit(undefined, 30);
    requestAnimationFrame(() => { try { cy.resize(); cy.fit(undefined, 30); } catch { /* ignore */ } });
    } catch (e: any) {
      console.error('[BrainstormSandbox] cytoscape error:', e);
    }
  }, [collapsed, nodes, edges]);

  // Keep Cytoscape sized to its container. This fixes the common case where the
  // canvas initializes at 0x0 (dynamic import / fixed-height parent not laid out yet)
  // and would otherwise render nothing; also handles the synthesis-panel resize.
  useEffect(() => {
    if (collapsed || !containerRef.current) return;
    const ro = new ResizeObserver(() => {
      const cy = cyRef.current;
      if (cy && cy.container()) { cy.resize(); cy.fit(undefined, 30); }
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [collapsed]);

  useEffect(() => () => { cyRef.current?.destroy(); cyRef.current = null; }, []);

  // Napkin ↓ : queue the sentence (shows as a loading card) and free the textarea instantly.
  const send = () => {
    const t = text.trim();
    if (!t) return;
    setError(null);
    setQueue((q) => [...q, { id: `q-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, text: t }]);
    setText('');
  };

  // Process queued sends one at a time (server merge isn't concurrency-safe), removing
  // each card once its ideas land in the graph.
  useEffect(() => {
    if (queueProcessing.current || queue.length === 0) return;
    queueProcessing.current = true;
    const item = queue[0];
    (async () => {
      try {
        const res = await fetch('/api/brainstorm/ingest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: item.text }),
        });
        const d = await res.json();
        if (d.success) { setNodes(d.nodes || []); setEdges(d.edges || []); graphDirty.current = true; }
        else setError(d.error || 'Could not ingest.');
      } catch {
        setError('Ingest failed — is the dev server reachable?');
      } finally {
        setQueue((q) => q.filter((x) => x.id !== item.id));
        queueProcessing.current = false;
      }
    })();
  }, [queue]);

  // Synthesize the current graph into a summary + drafts.
  const synthesize = async () => {
    if (synthesizing || nodes.length === 0) return;
    setSynthesizing(true);
    setError(null);
    try {
      const res = await fetch('/api/brainstorm/synthesize', { method: 'POST' });
      const d = await res.json();
      if (!d.success) { setError(d.error || 'Synthesis failed.'); return; }
      setSummary(d.summary || '');
      setPillars(d.pillars || {});
      setDelegation(d.delegation || {});
    } catch {
      setError('Synthesis failed.');
    } finally {
      setSynthesizing(false);
    }
  };

  // Auto-synthesize once the send queue drains and the graph actually changed — no
  // manual button. Initial page load doesn't trigger it (graphDirty starts false).
  useEffect(() => {
    if (queue.length === 0 && graphDirty.current && nodes.length > 0 && !synthesizing) {
      graphDirty.current = false;
      void synthesize();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queue, nodes, synthesizing]);

  const reset = async () => {
    if (!window.confirm('Clear the brainstorm graph and synthesis?')) return;
    try { await fetch('/api/brainstorm', { method: 'DELETE' }); } catch { /* ignore */ }
    setNodes([]); setEdges([]); setSummary(''); setPillars({}); setDelegation({});
  };

  const hasPillars = Object.values(pillars).some((v) => v && String(v).trim());
  const hasDelegation = !!(delegation?.persona || (delegation?.mustHave || []).length || (delegation?.niceToHave || []).length);

  return (
    <section className="bg-card border border-border rounded-3xl shadow-xl border-t-4 border-t-amber-400 overflow-hidden mb-8">
      {/* Header */}
      <button onClick={() => setCollapsed((c) => !c)} className="w-full flex items-center justify-between px-6 py-4 hover:bg-muted/30 transition-colors text-left">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-amber-400/10 text-amber-500 border border-amber-400/20"><Lightbulb size={18} /></div>
          <div>
            <h2 className="text-sm font-bold uppercase tracking-widest text-foreground">💡 Brainstorming Sandbox</h2>
            <p className="text-[11px] text-muted-foreground italic mt-0.5">Dump raw ideas → live concept graph → draft the Initiative.</p>
          </div>
        </div>
        <ChevronDown size={18} className={cn('text-muted-foreground transition-transform', !collapsed && 'rotate-180')} />
      </button>

      {!collapsed && (
        <div className="px-4 pb-4 space-y-3 animate-in fade-in duration-200">
          {/* Full-width graph canvas with floating panels */}
          <div className="relative w-full bg-muted/20 border border-border rounded-2xl overflow-hidden" style={{ height: 480 }}>
            <div ref={containerRef} className="w-full" style={{ height: 480 }} />

            {nodes.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className="text-[11px] text-muted-foreground/60 italic">Send ideas from The Napkin Sketch to grow your concept graph.</span>
              </div>
            )}

            {/* Napkin Sketch — top-left, ~1/4 width */}
            <div className="absolute top-3 left-3 w-1/4 min-w-[210px] bg-card/95 backdrop-blur border border-border rounded-xl shadow-lg p-2.5 space-y-1.5 z-10">
              <div className="flex items-center justify-between">
                <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">The Napkin Sketch</label>
                {(nodes.length > 0 || summary) && (
                  <button onClick={reset} title="Reset sandbox" className="text-muted-foreground hover:text-foreground transition-colors"><RotateCcw size={11} /></button>
                )}
              </div>
              <div className="flex items-stretch gap-1.5">
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                  rows={3}
                  placeholder="Dump thoughts, keywords, chaos… (Enter to send · Shift+Enter = newline)"
                  className="flex-1 bg-muted/40 border border-border rounded-lg px-2 py-1.5 text-[11px] text-foreground outline-none focus:ring-2 focus:ring-amber-400/30 resize-none placeholder:text-muted-foreground/40"
                />
                <button
                  onClick={send}
                  disabled={!text.trim()}
                  title="Send into the graph"
                  className="shrink-0 w-8 self-stretch rounded-lg bg-amber-500 hover:bg-amber-400 text-white flex items-center justify-center transition-all disabled:opacity-40"
                >
                  <ArrowDown size={14} />
                </button>
              </div>

              {/* Queued sends — each shows as a loading card, then vanishes once merged. */}
              {queue.length > 0 && (
                <div className="space-y-1 pt-0.5">
                  {queue.map((item) => (
                    <div key={item.id} className="flex items-center gap-1.5 bg-amber-400/10 border border-amber-400/20 rounded-lg px-2 py-1 animate-in fade-in slide-in-from-top-1 duration-200">
                      <Loader2 size={10} className="animate-spin text-amber-500 shrink-0" />
                      <span className="text-[10px] text-foreground/70 truncate">{item.text}</span>
                    </div>
                  ))}
                </div>
              )}
              {error && <p className="text-[9px] text-red-500">{error}</p>}
            </div>

            {/* Legend — bottom-left */}
            <div className="absolute bottom-3 left-3 z-10 flex flex-col gap-0.5 bg-card/80 backdrop-blur border border-border rounded-lg px-2 py-1.5">
              {Object.entries(CATEGORY_COLORS).map(([cat, color]) => (
                <span key={cat} className="flex items-center gap-1.5 text-[8px] font-bold uppercase tracking-wider text-muted-foreground">
                  <span className="w-2 h-2 rounded-full border border-black/10" style={{ background: color }} />{cat}
                </span>
              ))}
              <span className="text-[7px] text-muted-foreground/60 italic mt-1 normal-case tracking-normal">Hover a node to focus · scroll to zoom · drag to move</span>
            </div>

            {/* Synthesis — bottom-right, 1/4 width, expandable to 1/2 */}
            <div className={cn('absolute bottom-3 right-3 z-10 bg-card/95 backdrop-blur border border-border rounded-xl shadow-lg p-2.5 flex flex-col transition-all duration-200', synthExpanded ? 'w-1/2 h-2/3' : 'w-1/4 min-w-[210px] h-1/3')}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Synthesis</h3>
                  {synthesizing && (
                    <span className="flex items-center gap-1 text-[8px] font-bold uppercase tracking-widest text-blue-500">
                      <Loader2 size={9} className="animate-spin" /> synthesizing…
                    </span>
                  )}
                </div>
                <button onClick={() => setSynthExpanded((x) => !x)} title={synthExpanded ? 'Shrink' : 'Expand'} className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                  {synthExpanded ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
                </button>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar text-[11px] text-foreground/90 leading-relaxed whitespace-pre-wrap min-h-[80px]">
                {summary || <span className="text-muted-foreground/50 italic">Synthesize the graph to draft a structured summary here.</span>}
              </div>
            </div>
          </div>

          {/* Bridge to execution: combine the synthesis into the two Initiative steps */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => onAddToStrategic(pillars)}
              disabled={!hasPillars}
              className="px-4 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all disabled:opacity-40 flex items-center gap-2"
            >
              <Trophy size={12} /> Add to Strategic Conceptualization
            </button>
            <button
              onClick={() => onAddToDelegation(delegation)}
              disabled={!hasDelegation}
              className="px-4 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all disabled:opacity-40 flex items-center gap-2"
            >
              <ShieldCheck size={12} /> Add to Delegation &amp; Guardrails
            </button>
            <span className="text-[10px] text-muted-foreground italic">Keep brainstorming until both steps are complete.</span>
          </div>
        </div>
      )}
    </section>
  );
}

import { useMemo, useCallback } from 'react';
import { Ticket, BarCoords, TimelineRange, GanttScale } from './types';
import { getPixelPos, getPixelWidth } from './utils';

export interface GanttEngineOptions {
  parents: Ticket[];
  children: Ticket[];
  expandedParents: string[];
  timelineRange: TimelineRange | null;
  dayWidth: number;
  globalTickets: Ticket[];
}

export function useGanttEngine({
  parents,
  children,
  expandedParents,
  timelineRange,
  dayWidth,
  globalTickets
}: GanttEngineOptions) {
  
  // Logical Node Registry
  const { renderedCoords, totalCanvasHeight } = useMemo(() => {
    if (!timelineRange) return { renderedCoords: {}, totalCanvasHeight: 0 };

    const coordsByIdent: Record<string, BarCoords> = {};
    let currentY = 0;
    const rowHeight = 56;
    const childRowHeight = 40;

    parents.forEach(p => {
        const px = getPixelPos(p.start_date, timelineRange, dayWidth);
        const pw = getPixelWidth(p.start_date, p.due_date, timelineRange, dayWidth);
        coordsByIdent[p.identifier] = { id: p.id, ident: p.identifier, x: px, y: currentY + 28, w: pw, h: 24, isParent: true };
        currentY += rowHeight;

        if (expandedParents.includes(p.id)) {
            const pChildren = children.filter(c => c.parent_id === p.id);
            pChildren.forEach(c => {
                const cx = getPixelPos(c.start_date, timelineRange, dayWidth);
                const cw = getPixelWidth(c.start_date, c.due_date, timelineRange, dayWidth);
                coordsByIdent[c.identifier] = { id: c.id, ident: c.identifier, x: cx, y: currentY + 20, w: cw, h: 20, isParent: false };
                currentY += childRowHeight;
            });
        }
    });

    return { renderedCoords: coordsByIdent, totalCanvasHeight: Math.max(currentY + 100, 600) };
  }, [expandedParents, parents, children, timelineRange, dayWidth]);

  // Recursive Proxy Resolution
  const getVisibleProxy = useCallback((ident: string): BarCoords | null => {
    if (renderedCoords[ident]) return renderedCoords[ident];
    
    const tkt = globalTickets.find(t => t.identifier === ident);
    if (tkt && tkt.parent_id) {
       // Look up parent identifier from global state
       const parent = globalTickets.find(t => t.id === tkt.parent_id);
       if (parent) return getVisibleProxy(parent.identifier);
    }
    return null;
  }, [renderedCoords, globalTickets]);

  // Verified Edge Extraction
  const verifiedEdges = useMemo(() => {
    const edges: { from: BarCoords; to: BarCoords; blocker: string; target: string }[] = [];
    
    globalTickets.forEach(target => {
       if (target.blocked_by) {
          const blockers = target.blocked_by.split(',').map(s => s.trim());
          blockers.forEach(blockerIdent => {
             const fromNode = getVisibleProxy(blockerIdent);
             const toNode = getVisibleProxy(target.identifier);

             if (fromNode && toNode && fromNode.ident !== toNode.ident) {
                edges.push({ from: fromNode, to: toNode, blocker: blockerIdent, target: target.identifier });
             }
          });
       }
    });

    return edges;
  }, [globalTickets, getVisibleProxy]);

  return {
    renderedCoords,
    totalCanvasHeight,
    verifiedEdges
  };
}

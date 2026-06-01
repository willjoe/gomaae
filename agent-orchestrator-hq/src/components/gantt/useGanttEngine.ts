import { useMemo, useCallback } from 'react';
import { Ticket, BarCoords, TimelineRange, GanttScale, FlatNode } from './types';
import { getPixelPos, getPixelWidth } from './utils';

export interface GanttEngineOptions {
  parents: Ticket[];
  children: Ticket[];
  expandedParents: string[];
  timelineRange: TimelineRange | null;
  dayWidth: number;
  globalTickets: Ticket[];
  isTestingPhase?: boolean;
}

export function useGanttEngine({
  parents,
  children,
  expandedParents,
  timelineRange,
  dayWidth,
  globalTickets,
  isTestingPhase = false
}: GanttEngineOptions) {
  
  // Logical Node Registry
  const { renderedCoords, totalCanvasHeight, totalCanvasWidth, flatNodeList } = useMemo(() => {
    if (!timelineRange) return { renderedCoords: {}, totalCanvasHeight: 0, totalCanvasWidth: 0, flatNodeList: [] };

    const coordsByIdent: Record<string, BarCoords> = {};
    const totalDays = Math.ceil((timelineRange.end.getTime() - timelineRange.start.getTime()) / (1000 * 60 * 60 * 24));
    const calculatedWidth = Math.max(totalDays * dayWidth + 400, 1000);
    
    let currentY = 0;
    const rowHeight = 56;
    const childRowHeight = 40;

    const buildHierarchy = () => {
        const nodes: FlatNode[] = [];
        const added = new Set<string>();

        const processNode = (ticket: Ticket, depth: number) => {
            if (added.has(ticket.id)) return;
            added.add(ticket.id);

            const isBig = ticket.tier === 'Epic' || ticket.tier === 'Story';
            const h = isBig ? 24 : 20;
            const rH = isBig ? rowHeight : childRowHeight;
            const yPos = currentY + (isBig ? 28 : 20);

            // Register Main Ticket Coords
            coordsByIdent[ticket.identifier] = { 
                id: ticket.id, 
                ident: ticket.identifier, 
                x: getPixelPos(ticket.start_date, timelineRange, dayWidth), 
                y: yPos, 
                w: getPixelWidth(ticket.start_date, ticket.due_date, timelineRange, dayWidth), 
                h, 
                isParent: isBig 
            };

            // Check for Linked QA (Same-row logic)
            let linkedQA: Ticket | null = null;
            if (isTestingPhase && ticket.tier !== 'QA') {
                const qa = globalTickets.find(t => t.tier === 'QA' && t.linked_ticket_id === ticket.identifier);
                if (qa) {
                    linkedQA = qa;
                    added.add(qa.id); 
                    
                    coordsByIdent[qa.identifier] = {
                        id: qa.id,
                        ident: qa.identifier,
                        x: getPixelPos(qa.start_date, timelineRange, dayWidth),
                        y: yPos,
                        w: getPixelWidth(qa.start_date, qa.due_date, timelineRange, dayWidth),
                        h,
                        isParent: false
                    };
                }
            }

            nodes.push({ ticket, depth, linkedQA });
            currentY += rH;

            // Process children
            if (isTestingPhase || expandedParents.includes(ticket.id)) {
                const subChildren = globalTickets.filter(c => c.parent_id === ticket.id && c.tier !== 'QA');
                subChildren.forEach(sc => processNode(sc, depth + 1));
            }
        };

        parents.forEach(p => processNode(p, 0));
        return nodes;
    };

    const finalNodes = buildHierarchy();

    return { 
        renderedCoords: coordsByIdent, 
        totalCanvasHeight: Math.max(currentY + 100, 600),
        totalCanvasWidth: calculatedWidth,
        flatNodeList: finalNodes
    };
  }, [expandedParents, parents, children, timelineRange, dayWidth, isTestingPhase, globalTickets]);

  // Global ticket map for hierarchy lookups
  const globalTicketMap = useMemo(() => {
    const map: Record<string, Ticket> = {};
    globalTickets.forEach(t => { 
        if (typeof t.identifier === 'string') {
            map[t.identifier] = t; 
        }
    });
    return map;
  }, [globalTickets]);

  const globalIdToIdent = useMemo(() => {
    const map: Record<string, string> = {};
    globalTickets.forEach(t => { 
        if (typeof t.id === 'string' && typeof t.identifier === 'string') {
            map[t.id] = t.identifier; 
        }
    });
    return map;
  }, [globalTickets]);

  // Recursive Proxy Resolution
  const getVisibleProxy = useCallback((ident: string): BarCoords | null => {
    if (renderedCoords[ident]) return renderedCoords[ident];
    
    const tkt = globalTicketMap[ident];
    if (tkt && typeof tkt.parent_id === 'string') {
       const parentIdent = globalIdToIdent[tkt.parent_id];
       if (parentIdent) return getVisibleProxy(parentIdent);
    }
    return null;
  }, [renderedCoords, globalTicketMap, globalIdToIdent]);

  // Verified Edge Extraction
  const verifiedEdges = useMemo(() => {
    const edges: { from: BarCoords; to: BarCoords; blocker: string; target: string }[] = [];
    
    globalTickets.forEach(target => {
       // Suppress QA links in non-testing
       if (!isTestingPhase) {
          const isQA = target.tier === 'QA' || (typeof target.blocked_by === 'string' && target.blocked_by.includes('QA-'));
          if (isQA) return;
       }

       if (typeof target.blocked_by === 'string') {
          const blockers = target.blocked_by.split(',').map(s => s.trim());
          blockers.forEach(blockerIdent => {
             const fromNode = getVisibleProxy(blockerIdent);
             const toNode = getVisibleProxy(target.identifier);

             if (fromNode && toNode && fromNode.ident !== toNode.ident) {
                // Suppress internal branch connections
                const isAncestorOf = (a: string, d: string): boolean => {
                    const t = globalTicketMap[d];
                    if (!t || !t.parent_id) return false;
                    const p = globalIdToIdent[t.parent_id];
                    return p === a || (p ? isAncestorOf(a, p) : false);
                };

                const isInternal = isAncestorOf(fromNode.ident, toNode.ident) || isAncestorOf(toNode.ident, fromNode.ident);
                if (isInternal && !isTestingPhase) return;

                edges.push({ from: fromNode, to: toNode, blocker: blockerIdent, target: target.identifier });
             }
          });
       }
    });

    return edges;
  }, [globalTickets, getVisibleProxy, globalTicketMap, globalIdToIdent, isTestingPhase]);

  return {
    renderedCoords,
    totalCanvasHeight,
    totalCanvasWidth,
    verifiedEdges,
    flatNodeList
  };
}

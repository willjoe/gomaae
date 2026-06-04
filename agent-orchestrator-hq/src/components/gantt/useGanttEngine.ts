import { useMemo, useCallback } from 'react';
import { Ticket, BarCoords, TimelineRange, GanttScale, FlatNode, GanttEngineOptions } from './types';
import { getPixelPos, getPixelWidth } from './utils';

export function useGanttEngine({
  parents,
  childTickets,
  expandedParents,
  timelineRange,
  dayWidth,
  globalTickets,
  isTestingPhase = false
}: GanttEngineOptions) {
  
  // 1. Unified Node Registry & Coordinate Mapping
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
            if (!ticket || typeof ticket !== 'object' || added.has(ticket.id)) return;
            added.add(ticket.id);

            const isBig = ticket.tier === 'Epic' || ticket.tier === 'Story';
            const h = isBig ? 24 : 20;
            const rH = isBig ? rowHeight : childRowHeight;
            const yPos = currentY + (isBig ? 28 : 20);

            // Register Main Ticket Coords
            coordsByIdent[String(ticket.identifier)] = { 
                id: String(ticket.id), 
                ident: String(ticket.identifier), 
                x: getPixelPos(ticket.start_date, timelineRange, dayWidth), 
                y: yPos, 
                w: getPixelWidth(ticket.start_date, ticket.due_date, timelineRange, dayWidth), 
                h, 
                isParent: isBig 
            };

            // Check for Linked QA (Optional same-row logic, disabled if we want identical Dev behavior)
            let linkedQA: Ticket | null = null;
            // Only use same-row logic if we are NOT trying to show separate child rows
            const useSameRow = false; // Decoupled from isTestingPhase to match Dev behavior

            if (isTestingPhase && ticket.tier !== 'QA' && useSameRow) {
                const qa = globalTickets.find((t: Ticket) => t && t.tier === 'QA' && t.linked_ticket_id === ticket.id);
                if (qa) {
                    linkedQA = qa;
                    added.add(qa.id); 
                    
                    coordsByIdent[String(qa.identifier)] = {
                        id: String(qa.id),
                        ident: String(qa.identifier),
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

            // Process children (Include QA as children if not using same-row logic)
            if (isTestingPhase || expandedParents.includes(ticket.id)) {
                const subChildren = globalTickets.filter((c: Ticket) => {
                    if (!c) return false;
                    // Traditional parent link
                    if (c.parent_id === ticket.id && c.tier !== 'QA') return true;
                    // QA link if not using same-row
                    if (isTestingPhase && c.tier === 'QA' && c.linked_ticket_id === ticket.id && !useSameRow) return true;
                    return false;
                });
                subChildren.forEach((sc: Ticket) => processNode(sc, depth + 1));
            }
        };

        parents.forEach((p: Ticket) => {
            if (p) processNode(p, 0);
        });

        // 2. Process Orphans (Any childTicket that wasn't added via the hierarchy)
        childTickets.forEach((ct: Ticket) => {
            if (ct && !added.has(ct.id)) {
                processNode(ct, 0);
            }
        });

        return nodes;
    };

    const finalNodes = buildHierarchy();

    return { 
        renderedCoords: coordsByIdent, 
        totalCanvasHeight: Math.max(currentY + 100, 600),
        totalCanvasWidth: calculatedWidth,
        flatNodeList: finalNodes
    };
  }, [expandedParents, parents, childTickets, timelineRange, dayWidth, isTestingPhase, globalTickets]);

  // Global maps for hierarchy
  const globalTicketMap = useMemo(() => {
    const map: Record<string, Ticket> = {};
    globalTickets.forEach((t: Ticket) => { 
        if (t && typeof t.identifier === 'string') {
            map[t.identifier] = t; 
        }
    });
    return map;
  }, [globalTickets]);

  const globalIdToIdent = useMemo(() => {
    const map: Record<string, string> = {};
    globalTickets.forEach((t: Ticket) => { 
        if (t && typeof t.id === 'string' && typeof t.identifier === 'string') {
            map[t.id] = t.identifier; 
        }
    });
    return map;
  }, [globalTickets]);

  // Recursive Proxy Resolution with Cycle Detection
  const getVisibleProxy = useCallback((ident: string, visited = new Set<string>()): BarCoords | null => {
    if (renderedCoords[ident]) return renderedCoords[ident];
    if (visited.has(ident)) return null; // Cycle detected
    visited.add(ident);
    
    const tkt = globalTicketMap[ident];
    if (tkt && typeof tkt.parent_id === 'string') {
       const parentIdent = globalIdToIdent[tkt.parent_id];
       if (parentIdent) return getVisibleProxy(parentIdent, visited);
    }
    return null;
  }, [renderedCoords, globalTicketMap, globalIdToIdent]);

  // Ancestry check with Cycle Detection
  const isAncestorOf = useCallback((a: string, d: string, visited = new Set<string>()): boolean => {
    if (visited.has(d)) return false;
    visited.add(d);
    
    const t = globalTicketMap[d];
    if (!t || !t.parent_id) return false;
    const p = globalIdToIdent[t.parent_id];
    if (!p) return false;
    if (p === a) return true;
    return isAncestorOf(a, p, visited);
  }, [globalTicketMap, globalIdToIdent]);

  // Verified Edge Extraction
  const verifiedEdges = useMemo(() => {
    const edges: { from: BarCoords; to: BarCoords; blocker: string; target: string }[] = [];
    
    globalTickets.forEach((target: Ticket) => {
       if (!target || typeof target.identifier !== 'string') return;

       // Suppress QA links in non-testing
       if (!isTestingPhase) {
          const isQA = target.tier === 'QA' || (typeof target.blocked_by === 'string' && target.blocked_by.includes('QA-'));
          if (isQA) return;
       }

       if (typeof target.blocked_by === 'string') {
          const blockers = target.blocked_by.split(',').map((s: string) => s.trim());
          blockers.forEach((blockerIdent: string) => {
             const fromNode = getVisibleProxy(blockerIdent);
             const toNode = getVisibleProxy(target.identifier);

             if (fromNode && toNode && fromNode.ident !== toNode.ident) {
                // Suppress internal branch connections
                if (!isTestingPhase) {
                   if (isAncestorOf(fromNode.ident, toNode.ident) || isAncestorOf(toNode.ident, fromNode.ident)) return;
                }
                edges.push({ from: fromNode, to: toNode, blocker: blockerIdent, target: target.identifier });
             }
          });
       }
    });

    return edges;
  }, [globalTickets, getVisibleProxy, isAncestorOf, isTestingPhase]);

  return {
    renderedCoords,
    totalCanvasHeight,
    totalCanvasWidth,
    verifiedEdges,
    flatNodeList
  };
}

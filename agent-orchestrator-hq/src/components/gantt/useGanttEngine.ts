import { useMemo, useCallback } from 'react';
import { Ticket, BarCoords, TimelineRange, GanttScale } from './types';
import { getPixelPos, getPixelWidth } from './utils';

export interface FlatNode {
  ticket: Ticket;
  depth: number;
  linkedQA?: Ticket | null;
}

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
  const { renderedCoords, totalCanvasHeight, flatNodeList } = useMemo(() => {
    if (!timelineRange) return { renderedCoords: {}, totalCanvasHeight: 0, flatNodeList: [] };

    const coordsByIdent: Record<string, BarCoords> = {};
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
                    added.add(qa.id); // Prevent QA from appearing as its own row
                    
                    // Register QA Coords (Same Y as target)
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

            // 2. Check for hierarchical children
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
        flatNodeList: finalNodes
    };
  }, [expandedParents, parents, children, timelineRange, dayWidth, isTestingPhase, globalTickets]);

  // Global ticket map for hierarchy lookups
  const globalTicketMap = useMemo(() => {
    const map: Record<string, Ticket> = {};
    globalTickets.forEach(t => { map[t.identifier] = t; });
    return map;
  }, [globalTickets]);

  const globalIdToIdent = useMemo(() => {
    const map: Record<string, string> = {};
    globalTickets.forEach(t => { map[t.id] = t.identifier; });
    return map;
  }, [globalTickets]);

  // Recursive Proxy Resolution
  const getVisibleProxy = useCallback((ident: string): BarCoords | null => {
    if (renderedCoords[ident]) return renderedCoords[ident];
    
    const tkt = globalTicketMap[ident];
    if (tkt && tkt.parent_id) {
       const parentIdent = globalIdToIdent[tkt.parent_id];
       if (parentIdent) return getVisibleProxy(parentIdent);
    }
    return null;
  }, [renderedCoords, globalTicketMap, globalIdToIdent]);

  // Helper to check if node A is an ancestor of node B in global hierarchy
  const isAncestorOf = useCallback((ancestorIdent: string, descendantIdent: string): boolean => {
    const tkt = globalTicketMap[descendantIdent];
    if (!tkt || !tkt.parent_id) return false;
    const parentIdent = globalIdToIdent[tkt.parent_id];
    if (!parentIdent) return false;
    if (parentIdent === ancestorIdent) return true;
    return isAncestorOf(ancestorIdent, parentIdent);
  }, [globalTicketMap, globalIdToIdent]);

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
                // INTEGRITY RULE: Suppress lines connecting a node to its own logical parent or child via proxying
                // This prevents "ghost lines" like Task -> Epic when the Task is a grandchild of the Epic.
                const isInternalRelationship = isAncestorOf(fromNode.ident, toNode.ident) || isAncestorOf(toNode.ident, fromNode.ident);
                
                // EXCEPT in Testing phase, where we explicitly want to see build -> verification lines on the same branch
                if (isInternalRelationship && !isTestingPhase) {
                    return;
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
    verifiedEdges,
    flatNodeList
  };
}

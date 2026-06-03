export type GanttScale = 'months' | 'weeks' | 'days';

export interface Ticket {
  id: string;
  identifier: string;
  title: string;
  description: string;
  status: string;
  tier: string;
  parent_id: string | null;
  assigned_agent_id: string | null;
  document_name?: string | null;
  document_type?: 'markdown' | 'pdf' | null;
  document_content?: string | null;
  created_at: string;
  updated_at: string;
  start_date: string;
  due_date: string;
  execution_flag?: string | number | null;
  authorized_model?: string | null;
  llm_role?: string | null;
  personality_vector?: string | null;
  expected_token_usage?: number | null;
  actual_token_usage?: number | null;
  blocked_by?: string | null;
  blocking?: string | null;
  resource_scope?: string | null;
  mutation_scope?: string | null;
  ttl?: string | null;
  linked_ticket_id?: string | null;
}

export interface BarCoords {
  id: string;
  ident: string;
  x: number;
  y: number;
  w: number;
  h: number;
  isParent: boolean;
}

export interface TimelineRange {
  start: Date;
  end: Date;
}

export interface Viewport {
  left: number;
  width: number;
  right: number;
}

export interface FlatNode {
  ticket: Ticket;
  depth: number;
  linkedQA?: Ticket | null;
}

export interface GanttEngineOptions {
  parents: Ticket[];
  childTickets: Ticket[];
  expandedParents: string[];
  timelineRange: TimelineRange | null;
  dayWidth: number;
  globalTickets: Ticket[];
  isTestingPhase?: boolean;
}

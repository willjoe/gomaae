export type GanttScale = 'months' | 'weeks' | 'days' | 'hours';

export interface Ticket {
  id: string;
  identifier: string;
  title: string;
  description: string;
  status: string;
  // Internal agent execution state (Queued | Running | null), kept separate
  // from `status` so the standard status can sync with Jira/Linear/Asana.
  agent_state?: string | null;
  tier: string;
  parent_id: string | null;
  assigned_agent_id: string | null;
  document_name?: string | null;
  document_type?: 'markdown' | 'pdf' | null;
  document_content?: string | null;
  created_at: string;
  updated_at: string;
  start_datetime: string;
  due_datetime: string;
  execution_flag?: string | number | null;
  authorized_model?: string | null;
  llm_role?: string | null;
  personality_vector?: string | null;
  approx_runtime_minutes?: number | null;
  expected_token_usage?: number | null;
  actual_token_usage?: number | null;
  in_progress_at?: string | null;
  in_review_at?: string | null;
  blocked_by?: string | null;
  resource_scope?: string | null;
  mutation_scope?: string | null;
  ttl?: string | null;
  linked_ticket_id?: string | null;
  git_branch?: string | null;
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

export type GanttScale = 'months' | 'weeks' | 'days';

export interface Ticket {
  id: string;
  identifier: string;
  title: string;
  status: string;
  tier: string;
  parent_id: string | null;
  start_date: string;
  due_date: string;
  blocked_by?: string | null;
  blocking?: string | null;
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

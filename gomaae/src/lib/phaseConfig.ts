export const MY_AGENT_ID = 'Claude-dev-1';

export const PHASES = [
  { id: 'initiative',  tier: 'Epic',      path: '/initiative' },
  { id: 'planning',    tier: 'Story',     path: '/'           },
  { id: 'development', tier: 'Task',      path: '/dev'        },
  { id: 'testing',     tier: 'QA',        path: '/testing'    },
  { id: 'release',     tier: 'Operation', path: '/release'    },
] as const;

export type PhaseId = typeof PHASES[number]['id'];
export type Tier = typeof PHASES[number]['tier'];

export interface PhaseTheme {
  label: string;
  navActive: string;
  navActiveSub: string;
  navHover: string;
  navHoverIcon: string;
  text: string;
  border: string;
  hoverBorder: string;
  iconBox: string;
  solidIcon: string;
  badge: string;
  ring: string;
  selectedText: string;
}

export const PHASE_THEME: Record<string, PhaseTheme> = {
  initiative: {
    label: 'Initiative',
    navActive: 'bg-amber-600 text-white shadow-lg shadow-amber-900/20',
    navActiveSub: 'text-amber-50',
    navHover: 'hover:bg-amber-500/10 hover:text-amber-700 dark:hover:text-amber-400',
    navHoverIcon: 'group-hover:text-amber-600 dark:group-hover:text-amber-400',
    text: 'text-amber-600 dark:text-amber-400',
    border: 'border-amber-500/40',
    hoverBorder: 'hover:border-amber-500/60',
    iconBox: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    solidIcon: 'bg-amber-600 text-white',
    badge: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30',
    ring: 'ring-amber-500 shadow-amber-500/20',
    selectedText: 'text-amber-700 dark:text-amber-300',
  },
  planning: {
    label: 'Planning',
    navActive: 'bg-blue-600 text-white shadow-lg shadow-blue-900/20',
    navActiveSub: 'text-blue-50',
    navHover: 'hover:bg-blue-500/10 hover:text-blue-700 dark:hover:text-blue-400',
    navHoverIcon: 'group-hover:text-blue-600 dark:group-hover:text-blue-400',
    text: 'text-blue-600 dark:text-blue-400',
    border: 'border-blue-500/40',
    hoverBorder: 'hover:border-blue-500/60',
    iconBox: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    solidIcon: 'bg-blue-600 text-white',
    badge: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30',
    ring: 'ring-blue-500 shadow-blue-500/20',
    selectedText: 'text-blue-700 dark:text-blue-300',
  },
  development: {
    label: 'Development',
    navActive: 'bg-violet-600 text-white shadow-lg shadow-violet-900/20',
    navActiveSub: 'text-violet-50',
    navHover: 'hover:bg-violet-500/10 hover:text-violet-700 dark:hover:text-violet-400',
    navHoverIcon: 'group-hover:text-violet-600 dark:group-hover:text-violet-400',
    text: 'text-violet-600 dark:text-violet-400',
    border: 'border-violet-500/40',
    hoverBorder: 'hover:border-violet-500/60',
    iconBox: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
    solidIcon: 'bg-violet-600 text-white',
    badge: 'bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/30',
    ring: 'ring-violet-500 shadow-violet-500/20',
    selectedText: 'text-violet-700 dark:text-violet-300',
  },
  testing: {
    label: 'Testing',
    navActive: 'bg-red-600 text-white shadow-lg shadow-red-900/20',
    navActiveSub: 'text-red-50',
    navHover: 'hover:bg-red-500/10 hover:text-red-700 dark:hover:text-red-400',
    navHoverIcon: 'group-hover:text-red-600 dark:group-hover:text-red-400',
    text: 'text-red-600 dark:text-red-400',
    border: 'border-red-500/40',
    hoverBorder: 'hover:border-red-500/60',
    iconBox: 'bg-red-500/10 text-red-600 dark:text-red-400',
    solidIcon: 'bg-red-600 text-white',
    badge: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30',
    ring: 'ring-red-500 shadow-red-500/20',
    selectedText: 'text-red-700 dark:text-red-300',
  },
  release: {
    label: 'Operation',
    navActive: 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/20',
    navActiveSub: 'text-emerald-50',
    navHover: 'hover:bg-emerald-500/10 hover:text-emerald-700 dark:hover:text-emerald-400',
    navHoverIcon: 'group-hover:text-emerald-600 dark:group-hover:text-emerald-400',
    text: 'text-emerald-600 dark:text-emerald-400',
    border: 'border-emerald-500/40',
    hoverBorder: 'hover:border-emerald-500/60',
    iconBox: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    solidIcon: 'bg-emerald-600 text-white',
    badge: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
    ring: 'ring-emerald-500 shadow-emerald-500/20',
    selectedText: 'text-emerald-700 dark:text-emerald-300',
  },
};

export function getPhaseTheme(phaseId: string): PhaseTheme {
  return PHASE_THEME[phaseId] ?? PHASE_THEME.planning;
}

export function getPhaseForTier(tier: string): string {
  return PHASES.find(p => p.tier === tier)?.id ?? 'planning';
}

export function getRouteForPhase(phaseId: string): string {
  return PHASES.find(p => p.id === phaseId)?.path ?? '/';
}

export function getTierBadgeClasses(tier: string): string {
  switch (tier) {
    case 'Epic':      return 'bg-amber-500/10 text-amber-600 dark:text-amber-500 border-amber-500/20';
    case 'Operation': return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-500 border-emerald-500/20';
    case 'Story':     return 'bg-blue-500/10 text-blue-600 dark:text-blue-500 border-blue-500/20';
    case 'Task':      return 'bg-violet-500/10 text-violet-600 dark:text-violet-500 border-violet-500/20';
    case 'QA':        return 'bg-pink-500/10 text-pink-600 dark:text-pink-500 border-pink-500/20';
    case 'UnitTest':  return 'bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-500 border-fuchsia-500/20';
    case 'Triage':    return 'bg-orange-500/10 text-orange-600 dark:text-orange-500 border-orange-500/20';
    default:          return 'bg-muted text-muted-foreground border-border';
  }
}

export function getStatusDotClasses(status: string): string {
  switch (status) {
    case 'Done':        return 'bg-green-500';
    case 'In Progress': return 'bg-amber-500 animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.4)]';
    case 'In Review':   return 'bg-pink-500';
    default:            return 'bg-slate-700';
  }
}

export function getStatusBadgeClasses(status: string): string {
  switch (status) {
    case 'Done':        return 'bg-green-500/10 text-green-600 border-green-500/20';
    case 'In Progress': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
    case 'In Review':   return 'bg-pink-500/10 text-pink-600 border-pink-500/20';
    default:            return 'bg-muted text-muted-foreground border-border';
  }
}

export function getAgentStateClasses(agentState?: string | null): string {
  switch (agentState) {
    case 'Queued':  return 'bg-amber-500/10 text-amber-600 dark:text-amber-500 border-amber-500/20';
    case 'Running': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
    default:        return 'bg-muted text-muted-foreground border-border';
  }
}

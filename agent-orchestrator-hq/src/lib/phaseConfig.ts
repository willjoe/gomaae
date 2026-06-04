export const MY_AGENT_ID = 'Claude-dev-1';

export const PHASES = [
  { id: 'initiative',  tier: 'Epic',   path: '/initiative' },
  { id: 'planning',    tier: 'Story',  path: '/'           },
  { id: 'development', tier: 'Task',   path: '/dev'        },
  { id: 'testing',     tier: 'QA',     path: '/testing'    },
  { id: 'release',     tier: 'Triage', path: '/release'    },
] as const;

export type PhaseId = typeof PHASES[number]['id'];
export type Tier = typeof PHASES[number]['tier'];

export function getPhaseForTier(tier: string): string {
  return PHASES.find(p => p.tier === tier)?.id ?? 'planning';
}

export function getRouteForPhase(phaseId: string): string {
  return PHASES.find(p => p.id === phaseId)?.path ?? '/';
}

export function getTierBadgeClasses(tier: string): string {
  switch (tier) {
    case 'Epic':   return 'bg-amber-500/10 text-amber-600 dark:text-amber-500 border-amber-500/20';
    case 'Story':  return 'bg-blue-500/10 text-blue-600 dark:text-blue-500 border-blue-500/20';
    case 'Task':   return 'bg-blue-500/10 text-blue-600 dark:text-blue-500 border-blue-500/20';
    case 'QA':     return 'bg-pink-500/10 text-pink-600 dark:text-pink-500 border-pink-500/20';
    case 'Triage': return 'bg-orange-500/10 text-orange-600 dark:text-orange-500 border-orange-500/20';
    default:       return 'bg-muted text-muted-foreground border-border';
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

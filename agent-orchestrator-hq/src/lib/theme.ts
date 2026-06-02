export interface ThemeColors {
  text: string;
  bg: string;
  border: string;
  decoration: string;
  button: string;
  icon: string;
  color: string; // Hex color for SVG/Canvas usage
}

export const lifecycleTheme: Record<string, ThemeColors> = {
  initiative: {
    text: 'text-amber-500',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    decoration: 'decoration-amber-600/30',
    button: 'bg-amber-600 hover:bg-amber-500 shadow-amber-900/20',
    icon: 'text-amber-500',
    color: '#f59e0b' // Amber 500
  },
  planning: {
    text: 'text-indigo-400',
    bg: 'bg-indigo-400/10',
    border: 'border-indigo-400/20',
    decoration: 'decoration-indigo-600/30',
    button: 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-900/20',
    icon: 'text-indigo-400',
    color: '#818cf8' // Indigo 400
  },
  development: {
    text: 'text-blue-500',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
    decoration: 'decoration-blue-600/30',
    button: 'bg-blue-600 hover:bg-blue-500 shadow-blue-900/20',
    icon: 'text-blue-500',
    color: '#3b82f6' // Blue 500
  },
  testing: {
    text: 'text-pink-400',
    bg: 'bg-pink-400/10',
    border: 'border-pink-400/20',
    decoration: 'decoration-pink-600/30',
    button: 'bg-pink-600 hover:bg-pink-500 shadow-pink-900/20',
    icon: 'text-pink-400',
    color: '#f472b6' // Pink 400
  },
  release: {
    text: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    decoration: 'decoration-emerald-600/30',
    button: 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/20',
    icon: 'text-emerald-500',
    color: '#10b981' // Emerald 500
  }
};

export const viewerTheme: Record<string, ThemeColors> = {
  repository: {
    text: 'text-blue-400',
    bg: 'bg-blue-600/10',
    border: 'border-blue-500/50',
    decoration: 'decoration-blue-600/30',
    button: 'bg-blue-600 hover:bg-blue-500 shadow-blue-900/20',
    icon: 'text-blue-400',
    color: '#60a5fa'
  },
  registry: {
    text: 'text-purple-400',
    bg: 'bg-purple-600/10',
    border: 'border-purple-500/50',
    decoration: 'decoration-purple-600/30',
    button: 'bg-purple-600 hover:bg-purple-500 shadow-purple-900/20',
    icon: 'text-purple-400',
    color: '#c084fc'
  },
  documents: {
    text: 'text-slate-900 dark:text-slate-100',
    bg: 'bg-slate-500/10',
    border: 'border-slate-500/50',
    decoration: 'decoration-slate-400/50',
    button: 'bg-slate-800 dark:bg-white hover:bg-slate-700 dark:hover:bg-slate-200 text-white dark:text-black',
    icon: 'text-slate-600 dark:text-slate-100',
    color: '#64748b'
  },
  'ai-engine': {
    text: 'text-amber-400',
    bg: 'bg-amber-600/10',
    border: 'border-amber-500/50',
    decoration: 'decoration-amber-600/30',
    button: 'bg-amber-600 hover:bg-amber-500 shadow-amber-900/20',
    icon: 'text-amber-400',
    color: '#fbbf24'
  },
  cloud: {
    text: 'text-emerald-500',
    bg: 'bg-emerald-600/10',
    border: 'border-emerald-500/50',
    decoration: 'decoration-emerald-600/30',
    button: 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/20',
    icon: 'text-emerald-500',
    color: '#10b981'
  }
};

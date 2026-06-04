'use client';

import React from 'react';
import { cn } from '@/lib/cn';

const COLOR_CLASSES: Record<string, string> = {
  amber:  'text-amber-500 border-amber-500/20',
  blue:   'text-blue-500 border-blue-500/20',
  green:  'text-green-500 border-green-500/20',
  violet: 'text-violet-500 border-violet-500/20',
  pink:   'text-pink-500 border-pink-500/20',
  orange: 'text-orange-500 border-orange-500/20',
  red:    'text-red-500 border-red-500/20',
  indigo: 'text-indigo-500 border-indigo-500/20',
};

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  desc: string;
  color: keyof typeof COLOR_CLASSES;
}

export default function StatCard({ icon, label, value, desc, color }: StatCardProps) {
  return (
    <div className={cn('bg-card border border-border rounded-3xl p-6 space-y-4 shadow-xl border-l-4', COLOR_CLASSES[color])}>
      <div className="flex items-center justify-between opacity-80">
        {icon}
        <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 bg-muted rounded border border-border font-mono">
          {label}
        </span>
      </div>
      <div>
        <div className="text-3xl font-bold text-foreground tracking-tighter italic">{value}</div>
        <p className="text-muted-foreground text-[10px] mt-1 uppercase font-bold tracking-tighter">{desc}</p>
      </div>
    </div>
  );
}

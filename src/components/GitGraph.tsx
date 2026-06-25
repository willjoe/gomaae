'use client';

import React, { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/cn';

interface GraphCommit {
  hash: string;
  short: string;
  parents: string[];
  refs: string[];
  message: string;
  author: string;
  date: string;
  lane: number;
  color: string;
  aiModel?: string;
}

interface GitGraphProps {
  commits: GraphCommit[];
  className?: string;
}

const ROW_H = 32;
const LANE_W = 20;
const DOT_R = 5;
const LEFT_PAD = 12;
const INFO_LEFT = 16; // px gap between last lane and text

export default function GitGraph({ commits, className }: GitGraphProps) {
  const maxLane = commits.reduce((m, c) => Math.max(m, c.lane), 0);
  const graphWidth = LEFT_PAD + (maxLane + 1) * LANE_W + INFO_LEFT;
  const totalHeight = commits.length * ROW_H;

  // Build parent→row-index map for drawing lines.
  const hashToRow = new Map<string, number>();
  commits.forEach((c, i) => hashToRow.set(c.hash, i));

  return (
    <div className={cn('flex gap-0 overflow-x-auto', className)}>
      {/* SVG lane area */}
      <svg
        width={graphWidth}
        height={totalHeight}
        className="shrink-0 select-none"
        style={{ fontFamily: 'monospace' }}
      >
        {/* Draw lines first (below dots) */}
        {commits.map((c, row) => {
          const cy = row * ROW_H + ROW_H / 2;
          const cx = LEFT_PAD + c.lane * LANE_W;
          return c.parents.map((p) => {
            const pRow = hashToRow.get(p);
            if (pRow === undefined) return null;
            const pCommit = commits[pRow];
            const py = pRow * ROW_H + ROW_H / 2;
            const px = LEFT_PAD + pCommit.lane * LANE_W;
            if (cx === px) {
              // Straight vertical line
              return (
                <line
                  key={`${c.hash}-${p}`}
                  x1={cx} y1={cy + DOT_R}
                  x2={px} y2={py - DOT_R}
                  stroke={c.color}
                  strokeWidth={1.5}
                  opacity={0.6}
                />
              );
            }
            // Curved line for branch/merge
            const midY = (cy + py) / 2;
            return (
              <path
                key={`${c.hash}-${p}`}
                d={`M ${cx} ${cy + DOT_R} C ${cx} ${midY}, ${px} ${midY}, ${px} ${py - DOT_R}`}
                fill="none"
                stroke={c.color}
                strokeWidth={1.5}
                opacity={0.6}
              />
            );
          });
        })}

        {/* Dots */}
        {commits.map((c, row) => {
          const cy = row * ROW_H + ROW_H / 2;
          const cx = LEFT_PAD + c.lane * LANE_W;
          return (
            <circle
              key={c.hash}
              cx={cx}
              cy={cy}
              r={DOT_R}
              fill={c.color}
              stroke="var(--color-card, #1c1c1e)"
              strokeWidth={1.5}
            />
          );
        })}
      </svg>

      {/* Commit info text */}
      <div className="flex-1 min-w-0">
        {commits.map((c, row) => (
          <div
            key={c.hash}
            className="flex items-center gap-2 px-2 hover:bg-muted/40 transition-colors"
            style={{ height: ROW_H }}
          >
            {/* Ref badges (branch / tag names) */}
            {c.refs.filter(r => !r.includes('HEAD')).slice(0, 2).map((ref) => {
              const isRemote = ref.startsWith('origin/');
              const label = ref.replace(/^(HEAD -> |origin\/)/, '');
              return (
                <span
                  key={ref}
                  className={cn(
                    'text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0 border leading-none',
                    isRemote
                      ? 'bg-orange-500/10 text-orange-600 border-orange-500/20'
                      : 'bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400'
                  )}
                >
                  {label}
                </span>
              );
            })}
            {/* HEAD badge */}
            {c.refs.some(r => r.startsWith('HEAD ->') || r === 'HEAD') && (
              <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0 border leading-none bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                HEAD
              </span>
            )}
            {/* Message */}
            <span className="text-xs text-foreground font-mono truncate flex-1 min-w-0" title={c.message}>
              {c.message}
            </span>
            {/* AI model badge */}
            {c.aiModel && (
              <span className="text-[8px] font-bold px-1.5 py-0.5 rounded border shrink-0 leading-none bg-violet-500/10 text-violet-600 border-violet-500/20 dark:text-violet-400 whitespace-nowrap">
                ✦ {c.aiModel}
              </span>
            )}
            {/* Hash + meta */}
            <span className="text-[10px] font-mono text-muted-foreground/60 shrink-0">{c.short}</span>
            <span className="text-[10px] text-muted-foreground/50 shrink-0 hidden sm:block">{c.date}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

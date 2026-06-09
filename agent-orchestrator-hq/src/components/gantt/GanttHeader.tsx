'use client';

import React, { useMemo } from 'react';
import { TimelineRange, GanttScale } from './types';
import { getPixelPos } from './utils';

interface GanttHeaderProps {
  timelineRange: TimelineRange;
  dayWidth: number;
  scale: GanttScale;
}

export const GanttHeader: React.FC<GanttHeaderProps> = ({ 
  timelineRange, 
  dayWidth, 
  scale,
}) => {
  const monthLabels = useMemo(() => {
    if (scale === 'hours') return [];
    const result: { label: string; x: number; width: number }[] = [];
    const curr = new Date(timelineRange.start);
    curr.setHours(0, 0, 0, 0);
    const end = new Date(timelineRange.end);

    const iter = new Date(curr);
    iter.setDate(1);
    if (iter < curr) iter.setMonth(iter.getMonth() + 1);

    while (iter < end) {
      const monthStart = new Date(iter);
      const nextMonth = new Date(iter);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      
      const labelEnd = nextMonth < end ? nextMonth : end;
      const duration = (labelEnd.getTime() - monthStart.getTime()) / (1000 * 60 * 60 * 24);
      
      result.push({
        label: monthStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        x: getPixelPos(monthStart, timelineRange, dayWidth),
        width: duration * dayWidth,
      });
      iter.setMonth(iter.getMonth() + 1);
    }
    return result;
  }, [timelineRange, dayWidth, scale]);

  const weekLabels = useMemo(() => {
    if (scale === 'hours') return [];
    const result: { label: string; x: number; width: number }[] = [];
    const curr = new Date(timelineRange.start);
    curr.setHours(0, 0, 0, 0);
    const end = new Date(timelineRange.end);

    const iter = new Date(curr);
    while(iter.getDay() !== 1) iter.setDate(iter.getDate() + 1);

    while (iter < end) {
        const weekStart = new Date(iter);
        const nextWeek = new Date(iter);
        nextWeek.setDate(nextWeek.getDate() + 7);
        const labelEnd = nextWeek < end ? nextWeek : end;
        const duration = (labelEnd.getTime() - weekStart.getTime()) / (1000 * 60 * 60 * 24);

        const firstJan = new Date(weekStart.getFullYear(), 0, 1);
        const weekNum = Math.ceil((((weekStart.getTime() - firstJan.getTime()) / 86400000) + firstJan.getDay() + 1) / 7);

        result.push({
            label: `W${weekNum}`,
            x: getPixelPos(weekStart, timelineRange, dayWidth),
            width: duration * dayWidth,
        });
        iter.setDate(iter.getDate() + 7);
    }
    return result;
  }, [timelineRange, dayWidth, scale]);

  const dayLabels = useMemo(() => {
    if (scale !== 'days' && scale !== 'hours') return [];
    const result: { label: string; x: number; width: number }[] = [];
    const curr = new Date(timelineRange.start);
    curr.setHours(0, 0, 0, 0);
    const end = new Date(timelineRange.end);

    const iter = new Date(curr);
    while (iter < end) {
        result.push({
            label: scale === 'hours' ? iter.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : iter.getDate().toString(),
            x: getPixelPos(new Date(iter), timelineRange, dayWidth),
            width: dayWidth,
        });
        iter.setDate(iter.getDate() + 1);
    }
    return result;
  }, [timelineRange, dayWidth, scale]);

  const hourLabels = useMemo(() => {
    if (scale !== 'hours') return [];
    const result: { label: string; x: number; width: number }[] = [];
    const curr = new Date(timelineRange.start);
    curr.setMinutes(0, 0, 0);
    const end = new Date(timelineRange.end);

    const iter = new Date(curr);
    while (iter < end) {
        result.push({
            label: iter.getHours().toString().padStart(2, '0'),
            x: getPixelPos(new Date(iter), timelineRange, dayWidth),
            width: dayWidth / 24,
        });
        iter.setHours(iter.getHours() + 1);
    }
    return result;
  }, [timelineRange, dayWidth, scale]);

  return (
    <div className="h-full flex flex-col bg-muted/30 select-none">
      {scale !== 'hours' && (
        <>
          <div className="h-1/3 relative border-b border-border/50">
            {monthLabels.map((l, i) => (
              <div 
                key={`month-${i}`}
                style={{ left: l.x, width: l.width }}
                className="absolute top-0 bottom-0 border-l border-border/50 flex items-center px-2 overflow-hidden bg-muted/20"
              >
                <span className="text-[8px] font-bold uppercase tracking-wider text-muted-foreground/80 whitespace-nowrap">
                  {l.label}
                </span>
              </div>
            ))}
          </div>
          <div className="h-1/3 relative border-b border-border/50">
            {weekLabels.map((l, i) => (
              <div 
                key={`week-${i}`}
                style={{ left: l.x, width: l.width }}
                className="absolute top-0 bottom-0 border-l border-border/50 flex items-center justify-center overflow-hidden"
              >
                <span className="text-[7px] font-medium text-muted-foreground/60">
                  {l.label}
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      <div className={`relative ${scale === 'hours' ? 'h-1/2 border-b border-border/50 bg-muted/20' : 'h-1/3'}`}>
        {dayLabels.map((l, i) => (
          <div 
            key={`day-${i}`}
            style={{ left: l.x, width: l.width }}
            className={`absolute top-0 bottom-0 border-l ${scale === 'hours' ? 'border-border/50 px-2 flex items-center' : 'border-border/30 flex items-center justify-center'} overflow-hidden`}
          >
            <span className={`${scale === 'hours' ? 'text-[8px] font-bold uppercase tracking-wider text-muted-foreground/80' : 'text-[6px] font-medium text-muted-foreground/40'}`}>
              {l.label}
            </span>
          </div>
        ))}
      </div>

      {scale === 'hours' && (
        <div className="h-1/2 relative">
          {hourLabels.map((l, i) => (
            <div 
              key={`hour-${i}`}
              style={{ left: l.x, width: l.width }}
              className="absolute top-0 bottom-0 border-l border-border/30 flex items-center justify-center overflow-hidden"
            >
              <span className="text-[7px] font-medium text-muted-foreground/60">
                {l.label}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const GanttBackgroundGrid: React.FC<{
    timelineRange: TimelineRange;
    dayWidth: number;
    tickMode: GanttScale;
    totalHeight: number;
}> = ({ timelineRange, dayWidth, tickMode, totalHeight }) => {
    const ticks = useMemo(() => {
        const result: { x: number; type: 'major' | 'minor' }[] = [];
        const curr = new Date(timelineRange.start);
        curr.setHours(0, 0, 0, 0);
        const end = new Date(timelineRange.end);

        if (tickMode === 'months') {
            const iter = new Date(curr);
            iter.setDate(1);
            if (iter < curr) iter.setMonth(iter.getMonth() + 1);
            while (iter < end) {
                result.push({ x: getPixelPos(new Date(iter), timelineRange, dayWidth), type: 'major' });
                iter.setMonth(iter.getMonth() + 1);
            }
        } else if (tickMode === 'weeks') {
            const iter = new Date(curr);
            while(iter.getDay() !== 1) iter.setDate(iter.getDate() + 1);
            while (iter < end) {
                result.push({ x: getPixelPos(new Date(iter), timelineRange, dayWidth), type: 'major' });
                iter.setDate(iter.getDate() + 7);
            }
        } else if (tickMode === 'hours') {
            const iter = new Date(curr);
            while (iter < end) {
                const isDayStart = iter.getHours() === 0;
                result.push({ 
                    x: getPixelPos(new Date(iter), timelineRange, dayWidth), 
                    type: isDayStart ? 'major' : 'minor' 
                });
                iter.setHours(iter.getHours() + 1);
            }
        } else {
            const iter = new Date(curr);
            while (iter < end) {
                const isWeekStart = iter.getDay() === 1;
                result.push({ 
                    x: getPixelPos(new Date(iter), timelineRange, dayWidth), 
                    type: isWeekStart ? 'major' : 'minor' 
                });
                iter.setDate(iter.getDate() + 1);
            }
        }
        return result;
    }, [timelineRange, dayWidth, tickMode]);

    return (
        <div className="absolute inset-0 pointer-events-none" style={{ height: totalHeight }}>
            {ticks.map((t, i) => (
                <div 
                    key={`tick-${i}`}
                    style={{ left: t.x }}
                    className={`absolute top-0 bottom-0 w-px z-0 ${t.type === 'major' ? 'bg-border/40' : 'bg-border/10'}`}
                />
            ))}
        </div>
    );
};
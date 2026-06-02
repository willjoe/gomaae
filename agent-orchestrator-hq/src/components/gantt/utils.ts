import { TimelineRange } from './types';

/**
 * Calculates pixel position for a date within a timeline range
 */
export const getPixelPos = (dateVal: string | Date, range: TimelineRange | null, dayWidth: number): number => {
  if (!dateVal || !range) return 0;
  const date = typeof dateVal === 'string' ? new Date(dateVal) : dateVal;
  const diff = date.getTime() - range.start.getTime();
  return (diff / (1000 * 60 * 60 * 24)) * dayWidth;
};

/**
 * Calculates pixel width for a duration between two dates
 */
export const getPixelWidth = (startVal: string | Date, endVal: string | Date, range: TimelineRange | null, dayWidth: number): number => {
  if (!startVal || !endVal || !range) return 100;
  const start = typeof startVal === 'string' ? new Date(startVal) : startVal;
  const end = typeof endVal === 'string' ? new Date(endVal) : endVal;
  const diff = end.getTime() - start.getTime();
  return Math.max((diff / (1000 * 60 * 60 * 24)) * dayWidth, 20);
};

/**
 * Generates an S-curve path string for SVG dependency lines
 */
export const generateSCurvePath = (x1: number, y1: number, x2: number, y2: number): string => {
  const gap = x2 - x1;
  const hStep = Math.max(gap / 2, 15);
  return `M ${x1} ${y1} C ${x1 + hStep} ${y1}, ${x2 - hStep} ${y2}, ${x2} ${y2}`;
};

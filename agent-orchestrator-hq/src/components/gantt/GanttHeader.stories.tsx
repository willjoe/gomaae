import type { Meta, StoryObj } from '@storybook/react';
import { GanttHeader, GanttBackgroundGrid } from './GanttHeader';
import { TimelineRange } from './types';
import React from 'react';

const timelineRange: TimelineRange = {
  start: new Date('2026-05-01'),
  end: new Date('2026-08-01'),
};

const meta: Meta = {
  title: 'Atoms/Gantt/GanttHeader',
  parameters: {
    layout: 'padded',
  },
};

export default meta;

export const Months: StoryObj = {
  render: () => (
    <div className="relative border border-border rounded-xl overflow-hidden" style={{ width: 800, height: 64 }}>
      <GanttHeader timelineRange={timelineRange} dayWidth={4} scale="months" />
    </div>
  ),
};

export const Weeks: StoryObj = {
  render: () => (
    <div className="relative border border-border rounded-xl overflow-hidden" style={{ width: 800, height: 64 }}>
      <GanttHeader timelineRange={timelineRange} dayWidth={14} scale="weeks" />
    </div>
  ),
};

export const Days: StoryObj = {
  render: () => (
    <div className="relative border border-border rounded-xl overflow-hidden" style={{ width: 800, height: 64 }}>
      <GanttHeader
        timelineRange={{ start: new Date('2026-06-01'), end: new Date('2026-06-30') }}
        dayWidth={26}
        scale="days"
      />
    </div>
  ),
};

export const BackgroundGrid_Weeks: StoryObj = {
  render: () => (
    <div className="relative border border-border rounded-xl overflow-hidden bg-muted/10" style={{ width: 800, height: 200 }}>
      <GanttBackgroundGrid
        timelineRange={timelineRange}
        dayWidth={14}
        tickMode="weeks"
        totalHeight={200}
      />
    </div>
  ),
};

export const BackgroundGrid_Days: StoryObj = {
  render: () => (
    <div className="relative border border-border rounded-xl overflow-hidden bg-muted/10" style={{ width: 800, height: 200 }}>
      <GanttBackgroundGrid
        timelineRange={{ start: new Date('2026-06-01'), end: new Date('2026-06-30') }}
        dayWidth={26}
        tickMode="days"
        totalHeight={200}
      />
    </div>
  ),
};

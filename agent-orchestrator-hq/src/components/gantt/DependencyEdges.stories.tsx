import type { Meta, StoryObj } from '@storybook/react';
import { DependencyEdges } from './DependencyEdges';
import React from 'react';

const meta: Meta<typeof DependencyEdges> = {
  title: 'Atoms/Gantt/DependencyEdges',
  component: DependencyEdges,
  parameters: {
    layout: 'padded',
  },
};

export default meta;
type Story = StoryObj<typeof DependencyEdges>;

export const Default: Story = {
  render: () => (
    <div className="relative border border-border rounded-xl bg-card overflow-hidden" style={{ width: 800, height: 200 }}>
      <DependencyEdges
        edges={[
          {
            blocker: 'TKT-1001',
            target: 'TKT-1002',
            from: { id: 'TKT-1001', ident: 'TKT-1001', x: 80, y: 40, w: 120, h: 20, isParent: false },
            to:   { id: 'TKT-1002', ident: 'TKT-1002', x: 300, y: 90, w: 140, h: 20, isParent: false },
          },
          {
            blocker: 'TKT-1002',
            target: 'TKT-1003',
            from: { id: 'TKT-1002', ident: 'TKT-1002', x: 300, y: 90, w: 140, h: 20, isParent: false },
            to:   { id: 'TKT-1003', ident: 'TKT-1003', x: 520, y: 140, w: 100, h: 20, isParent: false },
          },
        ]}
        viewport={{ left: 0, right: 800 }}
        themeColor="#3b82f6"
      />
    </div>
  ),
};

export const QATheme: Story = {
  render: () => (
    <div className="relative border border-border rounded-xl bg-card overflow-hidden" style={{ width: 800, height: 200 }}>
      <DependencyEdges
        edges={[
          {
            blocker: 'STR-1001',
            target: 'QA-1001',
            from: { id: 'STR-1001', ident: 'STR-1001', x: 60, y: 50, w: 200, h: 24, isParent: true },
            to:   { id: 'QA-1001',  ident: 'QA-1001',  x: 380, y: 130, w: 150, h: 20, isParent: false },
          },
        ]}
        viewport={{ left: 0, right: 800 }}
        themeColor="#ef4444"
      />
    </div>
  ),
};

export const Empty: Story = {
  args: {
    edges: [],
    viewport: { left: 0, right: 800 },
  },
};

import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import GitGraph from './GitGraph';

const meta: Meta<typeof GitGraph> = {
  title: 'Molecules/GitGraph',
  component: GitGraph,
  parameters: { layout: 'padded' },
};

export default meta;
type Story = StoryObj<typeof GitGraph>;

const now = new Date();
const d = (offsetDays: number) => new Date(now.getTime() - offsetDays * 86400000).toISOString();

export const Linear: Story = {
  args: {
    commits: [
      { hash: 'a1b2c3d4', short: 'a1b2c3d', parents: [], refs: ['HEAD', 'main'], message: 'feat: initial scaffold', author: 'Alice', date: d(10), lane: 0, color: '#6366f1' },
      { hash: 'b2c3d4e5', short: 'b2c3d4e', parents: ['a1b2c3d4'], refs: [], message: 'feat: add ticket model', author: 'Alice', date: d(8), lane: 0, color: '#6366f1' },
      { hash: 'c3d4e5f6', short: 'c3d4e5f', parents: ['b2c3d4e5'], refs: [], message: 'fix: validation edge case', author: 'Bob', date: d(5), lane: 0, color: '#6366f1' },
      { hash: 'd4e5f6a7', short: 'd4e5f6a', parents: ['c3d4e5f6'], refs: ['origin/main'], message: 'chore: bump version to 0.1.34', author: 'Alice', date: d(2), lane: 0, color: '#6366f1' },
    ],
  },
};

export const Branched: Story = {
  args: {
    commits: [
      { hash: 'aa000001', short: 'aa00000', parents: [], refs: ['main'], message: 'feat: project init', author: 'Alice', date: d(14), lane: 0, color: '#6366f1' },
      { hash: 'bb000002', short: 'bb00000', parents: ['aa000001'], refs: [], message: 'feat: add sidebar', author: 'Alice', date: d(12), lane: 0, color: '#6366f1' },
      { hash: 'cc000003', short: 'cc00000', parents: ['aa000001'], refs: ['feat/tkt-1004'], message: 'feat(tkt-1004): auth endpoint scaffold', author: 'Agent', date: d(11), lane: 1, color: '#10b981' },
      { hash: 'dd000004', short: 'dd00000', parents: ['bb000002'], refs: [], message: 'fix: sidebar active state', author: 'Bob', date: d(9), lane: 0, color: '#6366f1' },
      { hash: 'ee000005', short: 'ee00000', parents: ['cc000003'], refs: [], message: 'test: unit tests for auth', author: 'Agent', date: d(8), lane: 1, color: '#10b981' },
      { hash: 'ff000006', short: 'ff00000', parents: ['dd000004', 'ee000005'], refs: ['HEAD', 'origin/main'], message: 'Merge feat/tkt-1004 → main', author: 'Alice', date: d(6), lane: 0, color: '#6366f1' },
    ],
  },
};

export const Empty: Story = {
  args: { commits: [] },
};

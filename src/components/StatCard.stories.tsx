import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import StatCard from './StatCard';
import { Trophy, CheckCircle2, Clock, AlertTriangle, Bot, Zap, Activity, Star } from 'lucide-react';

const meta: Meta<typeof StatCard> = {
  title: 'Atoms/StatCard',
  component: StatCard,
  parameters: { layout: 'centered' },
};

export default meta;
type Story = StoryObj<typeof StatCard>;

export const Blue: Story = {
  args: {
    icon: <Activity size={16} />,
    label: 'In Progress',
    value: '12',
    desc: 'tickets active',
    color: 'blue',
  },
};

export const Green: Story = {
  args: {
    icon: <CheckCircle2 size={16} />,
    label: 'Done',
    value: '84',
    desc: 'tickets completed',
    color: 'green',
  },
};

export const Amber: Story = {
  args: {
    icon: <Clock size={16} />,
    label: 'Backlog',
    value: '37',
    desc: 'pending tickets',
    color: 'amber',
  },
};

export const Red: Story = {
  args: {
    icon: <AlertTriangle size={16} />,
    label: 'Overdue',
    value: '5',
    desc: 'past due date',
    color: 'red',
  },
};

export const Violet: Story = {
  args: {
    icon: <Bot size={16} />,
    label: 'Agent Active',
    value: '3',
    desc: 'containers running',
    color: 'violet',
  },
};

export const Orange: Story = {
  args: {
    icon: <Zap size={16} />,
    label: 'Velocity',
    value: '24',
    desc: 'tickets/week',
    color: 'orange',
  },
};

export const Indigo: Story = {
  args: {
    icon: <Star size={16} />,
    label: 'Avg Score',
    value: '87',
    desc: 'quality score',
    color: 'indigo',
  },
};

export const Pink: Story = {
  args: {
    icon: <Trophy size={16} />,
    label: 'Completion',
    value: '68%',
    desc: 'of project done',
    color: 'pink',
  },
};

export const AllColors: Story = {
  render: () => {
    const cards = [
      { icon: <Activity size={16} />, label: 'In Progress', value: '12', desc: 'tickets active', color: 'blue' as const },
      { icon: <CheckCircle2 size={16} />, label: 'Done', value: '84', desc: 'completed', color: 'green' as const },
      { icon: <Clock size={16} />, label: 'Backlog', value: '37', desc: 'pending', color: 'amber' as const },
      { icon: <AlertTriangle size={16} />, label: 'Overdue', value: '5', desc: 'past due', color: 'red' as const },
      { icon: <Bot size={16} />, label: 'Agents', value: '3', desc: 'running', color: 'violet' as const },
      { icon: <Zap size={16} />, label: 'Velocity', value: '24/wk', desc: 'completed', color: 'orange' as const },
      { icon: <Star size={16} />, label: 'Score', value: '87', desc: 'avg quality', color: 'indigo' as const },
      { icon: <Trophy size={16} />, label: 'Done', value: '68%', desc: 'of project', color: 'pink' as const },
    ];
    return (
      <div className="grid grid-cols-4 gap-4 p-8">
        {cards.map((c) => <StatCard key={c.color} {...c} />)}
      </div>
    );
  },
};

import type { Meta, StoryObj } from '@storybook/react';
import PillarCard from './PillarCard';
import { Lightbulb } from 'lucide-react';
import React from 'react';

const meta: Meta<typeof PillarCard> = {
  title: 'Molecules/Initiative/PillarCard',
  component: PillarCard,
  decorators: [
    (Story) => (
      <div className="p-8 bg-muted/10 flex justify-center">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof PillarCard>;

export const Draft: Story = {
  args: {
    title: 'Problem Definition',
    icon: <Lightbulb size={24} className="text-amber-500" />,
    isComplete: false,
    onClick: () => console.log('Clicked'),
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    solidifiedText: 'Solidified',
    draftText: 'Draft required',
    placeholderSummary: 'e.g. Current users experience a 40% drop-off during checkout...',
  },
};

export const Solidified: Story = {
  args: {
    ...Draft.args,
    isComplete: true,
    summary: 'Monolith coupling causes 4-week UI lead times, degrading A/B testing agility.',
  },
};

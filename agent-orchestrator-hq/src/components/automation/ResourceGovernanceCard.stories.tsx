import type { Meta, StoryObj } from '@storybook/react';
import ResourceGovernanceCard from './ResourceGovernanceCard';

const meta: Meta<typeof ResourceGovernanceCard> = {
  title: 'Molecules/Automation/ResourceGovernanceCard',
  component: ResourceGovernanceCard,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof ResourceGovernanceCard>;

export const Default: Story = {
  args: {
    maxParallelAgents: 5,
    setMaxParallelAgents: (val) => console.log('Max Agents:', val),
    dailyTokenBudget: 1000000,
    setDailyTokenBudget: (val) => console.log('Token Budget:', val),
  },
};

export const HighIntensity: Story = {
  args: {
    maxParallelAgents: 15,
    setMaxParallelAgents: (val) => console.log('Max Agents:', val),
    dailyTokenBudget: 4500000,
    setDailyTokenBudget: (val) => console.log('Token Budget:', val),
  },
};

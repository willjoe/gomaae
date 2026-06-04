import type { Meta, StoryObj } from '@storybook/react';
import DelegationReadiness from './DelegationReadiness';
import { LifecycleProvider } from '@/context/LifecycleContext';
import React, { useState } from 'react';
import type { DelegationData } from './DelegationReadiness';

const emptyData: DelegationData = {
  persona: '',
  mustHave: [''],
  niceToHave: [''],
  metricDays: 30,
  metricName: '',
  metricTarget: 0,
};

const filledData: DelegationData = {
  persona: 'Senior enterprise developer who integrates third-party APIs into existing monolith systems. Operates under tight security constraints and values predictability over novelty.',
  mustHave: ['Secure API key management', 'Retry logic with exponential backoff', 'Structured error logging'],
  niceToHave: ['Webhook support', 'OpenAPI schema export'],
  metricDays: 14,
  metricName: 'API integration success rate',
  metricTarget: 98,
};

const meta: Meta<typeof DelegationReadiness> = {
  title: 'Molecules/Initiative/DelegationReadiness',
  component: DelegationReadiness,
  decorators: [
    (Story) => (
      <LifecycleProvider>
        <div className="p-8 max-w-3xl mx-auto bg-background min-h-screen">
          <Story />
        </div>
      </LifecycleProvider>
    ),
  ],
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof DelegationReadiness>;

export const Empty: Story = {
  render: () => {
    const [data, setData] = useState<DelegationData>(emptyData);
    return <DelegationReadiness data={data} onChange={setData} />;
  },
};

export const Filled: Story = {
  render: () => {
    const [data, setData] = useState<DelegationData>(filledData);
    return <DelegationReadiness data={data} onChange={setData} />;
  },
};

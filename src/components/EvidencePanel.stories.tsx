import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import EvidencePanel from './EvidencePanel';
import { LifecycleProvider } from '@/context/LifecycleContext';

const meta: Meta<typeof EvidencePanel> = {
  title: 'Organisms/EvidencePanel',
  component: EvidencePanel,
  decorators: [
    (Story) => (
      <LifecycleProvider>
        <div className="p-8 bg-background min-h-screen max-w-2xl">
          <Story />
        </div>
      </LifecycleProvider>
    ),
  ],
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof EvidencePanel>;

// API calls return 404 in Storybook — the panel renders its empty/upload state.
export const Editable: Story = {
  args: { ticketId: 'mock-ticket-1', readOnly: false },
};

export const ReadOnly: Story = {
  args: { ticketId: 'mock-ticket-1', readOnly: true },
};

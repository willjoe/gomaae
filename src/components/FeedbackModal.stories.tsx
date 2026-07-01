import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import FeedbackModal from './FeedbackModal';
import { LifecycleProvider } from '@/context/LifecycleContext';

const meta: Meta<typeof FeedbackModal> = {
  title: 'Organisms/FeedbackModal',
  component: FeedbackModal,
  decorators: [
    (Story) => (
      <LifecycleProvider>
        <Story />
      </LifecycleProvider>
    ),
  ],
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof FeedbackModal>;

export const BugReport: Story = {
  render: () => {
    const [open, setOpen] = useState(true);
    return (
      <>
        <button
          onClick={() => setOpen(true)}
          className="m-8 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500"
        >
          Open Bug Report
        </button>
        <FeedbackModal isOpen={open} onClose={() => setOpen(false)} />
      </>
    );
  },
};

export const Closed: Story = {
  args: { isOpen: false, onClose: () => {} },
};

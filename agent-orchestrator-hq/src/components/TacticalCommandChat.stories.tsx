import type { Meta, StoryObj } from '@storybook/react';
import TacticalCommandChat from './TacticalCommandChat';
import { LifecycleProvider } from '@/context/LifecycleContext';
import React from 'react';
import { expect, userEvent, within, waitFor } from 'storybook/test';

const meta: Meta<typeof TacticalCommandChat> = {
  title: 'Molecules/Chat/TacticalCommandChat',
  component: TacticalCommandChat,
  decorators: [
    (Story) => (
      <LifecycleProvider>
        <div className="w-[300px] p-8 h-screen bg-muted/10">
          <Story />
        </div>
      </LifecycleProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof TacticalCommandChat>;

export const Default: Story = {
  args: {
    phaseId: 'planning',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    
    // Check initial state
    const input = canvas.getByPlaceholderText(/Ask the AI Assistant/i);
    await expect(input).toBeInTheDocument();
    
    // Test Typing
    await userEvent.type(input, 'Identify security risks in EPC-1002');
    await expect(input).toHaveValue('Identify security risks in EPC-1002');
    
    // Verify Send button is enabled
    const sendBtn = canvas.getByRole('button');
    await expect(sendBtn).not.toBeDisabled();
  }
};

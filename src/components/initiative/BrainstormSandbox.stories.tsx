import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import BrainstormSandbox from './BrainstormSandbox';
import { LifecycleProvider } from '@/context/LifecycleContext';

const meta: Meta<typeof BrainstormSandbox> = {
  title: 'Organisms/Initiative/BrainstormSandbox',
  component: BrainstormSandbox,
  decorators: [
    (Story) => (
      <LifecycleProvider>
        <div className="bg-background" style={{ height: '100vh' }}>
          <Story />
        </div>
      </LifecycleProvider>
    ),
  ],
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof BrainstormSandbox>;

// BrainstormSandbox fetches /api/brainstorm on mount — returns 404 in Storybook,
// rendering an empty cytoscape graph canvas.
export const Default: Story = {
  args: {
    onAddToStrategic: () => {},
    onAddToDelegation: () => {},
    onAddToCultural: () => {},
  },
};

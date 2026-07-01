import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import DevServerBar from './DevServerBar';
import { LifecycleProvider } from '@/context/LifecycleContext';

const meta: Meta<typeof DevServerBar> = {
  title: 'Organisms/DevServerBar',
  component: DevServerBar,
  decorators: [
    (Story) => (
      <LifecycleProvider>
        <div className="p-8 bg-background min-h-screen">
          <Story />
        </div>
      </LifecycleProvider>
    ),
  ],
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof DevServerBar>;

// DevServerBar fetches /api/dev-server on mount. In Storybook that endpoint
// returns 404, so it renders the "stopped" idle state by default.
export const Default: Story = {};

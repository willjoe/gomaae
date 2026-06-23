import type { Meta, StoryObj } from '@storybook/react';
import StrategicPillarWizard from './StrategicPillarWizard';
import { LifecycleProvider } from '@/context/LifecycleContext';
import { expect, within } from 'storybook/test';
import React from 'react';

const meta: Meta<typeof StrategicPillarWizard> = {
  title: 'Molecules/Initiative/StrategicPillarWizard',
  component: StrategicPillarWizard,
  decorators: [
    (Story) => (
      <LifecycleProvider>
        <div className="w-full h-screen bg-muted/10 relative">
          <Story />
        </div>
      </LifecycleProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof StrategicPillarWizard>;

export const Default: Story = {
  args: {
    pillarId: 'problem',
    initialData: '',
    onSave: (id, data) => console.log('Saved', id, data),
    onClose: () => console.log('Closed'),
  },
  play: async ({ canvasElement }) => {
    // Note: The wizard uses portals/fixed overlays, so we query the document body in Storybook
    const body = within(document.body);
    await expect(body.getByText('Problem Definition')).toBeInTheDocument();
    await expect(body.getByText('Define the "Why"')).toBeInTheDocument();
  }
};

import type { Meta, StoryObj } from '@storybook/react';
import StrategicPillarWizard from './StrategicPillarWizard';
import { expect, userEvent, within } from 'storybook/test';

const meta: Meta<typeof StrategicPillarWizard> = {
  title: 'Components/Initiative/StrategicPillarWizard',
  component: StrategicPillarWizard,
  decorators: [
    (Story) => (
      <div className="w-full h-screen bg-muted/10 relative">
        <Story />
      </div>
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
    await expect(body.getByText('Problem Statement')).toBeInTheDocument();
    await expect(body.getByText('Define the "Why"')).toBeInTheDocument();
  }
};

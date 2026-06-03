import type { Meta, StoryObj } from '@storybook/react';
import ConnectivityModal from './ConnectivityModal';
import { expect, within } from 'storybook/test';

const meta: Meta<typeof ConnectivityModal> = {
  title: 'Components/Modals/ConnectivityModal',
  component: ConnectivityModal,
};

export default meta;
type Story = StoryObj<typeof ConnectivityModal>;

export const Repository: Story = {
  args: {
    type: 'repository',
    isOpen: true,
    onClose: () => console.log('Close'),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Select Git Platform')).toBeInTheDocument();
    await expect(canvas.getByText('GitHub')).toBeInTheDocument();
    await expect(canvas.getByText('GitLab')).toBeInTheDocument();
  }
};

export const Sync: Story = {
  args: {
    type: 'sync',
    isOpen: true,
    onClose: () => console.log('Close'),
  },
};

export const Docs: Story = {
  args: {
    type: 'docs',
    isOpen: true,
    onClose: () => console.log('Close'),
  },
};

export const AI: Story = {
  args: {
    type: 'ai',
    isOpen: true,
    onClose: () => console.log('Close'),
  },
};

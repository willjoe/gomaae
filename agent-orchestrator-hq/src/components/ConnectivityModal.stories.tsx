import type { Meta, StoryObj } from '@storybook/react';
import ConnectivityModal from './ConnectivityModal';

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

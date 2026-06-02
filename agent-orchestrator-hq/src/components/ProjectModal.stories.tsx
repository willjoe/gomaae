import type { Meta, StoryObj } from '@storybook/react';
import ProjectModal from './ProjectModal';

const meta: Meta<typeof ProjectModal> = {
  title: 'Components/Modals/ProjectModal',
  component: ProjectModal,
};

export default meta;
type Story = StoryObj<typeof ProjectModal>;

export const Default: Story = {
  args: {
    isOpen: true,
    onClose: () => console.log('Close'),
    onProjectCreated: () => console.log('Created'),
  },
};

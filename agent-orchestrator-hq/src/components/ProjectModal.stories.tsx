import type { Meta, StoryObj } from '@storybook/react';
import ProjectModal from './ProjectModal';
import { expect, userEvent, within } from 'storybook/test';

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
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    
    // Check Header
    await expect(canvas.getByText('New Project Profile')).toBeInTheDocument();
    
    // Test Input Fields
    const nameInput = canvas.getByPlaceholderText(/e.g. Autonomous/i);
    await userEvent.type(nameInput, 'Quantum Neural Core');
    await expect(nameInput).toHaveValue('Quantum Neural Core');
    
    // Verify Action button is enabled
    const initBtn = canvas.getByText('Initialize Project');
    await expect(initBtn).not.toBeDisabled();
  }
};

import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import TicketFormModal from './TicketFormModal';
import { LifecycleProvider } from '@/context/LifecycleContext';
import { mockTickets } from './gantt/mockTickets';
import { Ticket } from './gantt/types';

const tickets = mockTickets as unknown as Ticket[];

const meta: Meta<typeof TicketFormModal> = {
  title: 'Organisms/TicketFormModal',
  component: TicketFormModal,
  decorators: [
    (Story) => (
      <LifecycleProvider initialTickets={tickets}>
        <Story />
      </LifecycleProvider>
    ),
  ],
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof TicketFormModal>;

export const EpicManual: Story = {
  render: () => {
    const [open, setOpen] = useState(true);
    return (
      <>
        <button onClick={() => setOpen(true)} className="m-8 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">
          Open Epic Modal
        </button>
        {open && <TicketFormModal phaseId="planning" tier="Epic" title="New Epic" onClose={() => setOpen(false)} />}
      </>
    );
  },
};

export const TaskManual: Story = {
  render: () => {
    const [open, setOpen] = useState(true);
    return (
      <>
        <button onClick={() => setOpen(true)} className="m-8 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">
          Open Task Modal
        </button>
        {open && <TicketFormModal phaseId="development" tier="Task" title="New Task" onClose={() => setOpen(false)} />}
      </>
    );
  },
};

export const TriageManual: Story = {
  render: () => {
    const [open, setOpen] = useState(true);
    return (
      <>
        <button onClick={() => setOpen(true)} className="m-8 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white">
          Open Triage Modal
        </button>
        {open && <TicketFormModal phaseId="triage" tier="Triage" title="New Triage" onClose={() => setOpen(false)} />}
      </>
    );
  },
};

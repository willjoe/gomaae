import type { Meta, StoryObj } from '@storybook/react';
import DocumentPreview from './DocumentPreview';
import { expect, within } from 'storybook/test';

const meta: Meta<typeof DocumentPreview> = {
  title: 'Components/DocumentPreview',
  component: DocumentPreview,
  parameters: {
    layout: 'padded',
  },
};

export default meta;
type Story = StoryObj<typeof DocumentPreview>;

const markdownContent = `
# Project High-Integrity Architecture

## Overview
This document outlines the core architectural mandates.
`;

export const Markdown: Story = {
  args: {
    doc: {
      name: 'ARCHITECTURE.md',
      type: 'markdown',
      content: markdownContent,
    },
    onClose: () => console.log('Close preview'),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('ARCHITECTURE.md')).toBeInTheDocument();
    await expect(canvas.getByText('Project High-Integrity Architecture')).toBeInTheDocument();
  }
};

export const PDF: Story = {
  args: {
    doc: {
      name: 'design-spec-v2.pdf',
      type: 'pdf',
      url: 'https://example.com/spec.pdf',
    },
    onClose: () => console.log('Close preview'),
  },
};

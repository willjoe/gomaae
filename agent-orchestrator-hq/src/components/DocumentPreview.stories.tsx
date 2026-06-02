import type { Meta, StoryObj } from '@storybook/react';
import DocumentPreview from './DocumentPreview';

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
This document outlines the core architectural mandates for the **Atomic Development** workflow.

### Mandates
1. **Surgical Edits**: Use \`replace\` whenever possible.
2. **Deterministic TDD**: All fixes must include reproduction tests.
3. **Containerized Execution**: Agents run in isolated Docker workers.

> "Quality is not an act, it is a habit."
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

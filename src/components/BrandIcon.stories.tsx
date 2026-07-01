import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import BrandIcon from './BrandIcon';

const meta: Meta<typeof BrandIcon> = {
  title: 'Atoms/BrandIcon',
  component: BrandIcon,
  parameters: { layout: 'centered' },
  argTypes: {
    brand: {
      control: 'select',
      options: ['anthropic', 'openai', 'gemini', 'ollama', 'github', 'gitlab', 'bitbucket', 'linear', 'jira', 'asana', 'notion', 'confluence', 'googlecloud', 'aws', 's3', 'azure'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof BrandIcon>;

export const Default: Story = {
  args: { brand: 'anthropic', size: 32 },
};

export const AllBrands: Story = {
  render: () => {
    const brands = ['anthropic', 'openai', 'gemini', 'ollama', 'github', 'gitlab', 'bitbucket', 'linear', 'jira', 'asana', 'notion', 'confluence', 'googlecloud', 'aws', 's3', 'azure'];
    return (
      <div className="grid grid-cols-4 gap-6 p-8">
        {brands.map((brand) => (
          <div key={brand} className="flex flex-col items-center gap-2">
            <BrandIcon brand={brand} size={32} />
            <span className="text-[10px] font-mono text-muted-foreground">{brand}</span>
          </div>
        ))}
      </div>
    );
  },
};

export const SizeVariants: Story = {
  render: () => (
    <div className="flex items-end gap-6 p-8">
      {[12, 16, 24, 32, 48].map((size) => (
        <div key={size} className="flex flex-col items-center gap-2">
          <BrandIcon brand="anthropic" size={size} />
          <span className="text-[10px] font-mono text-muted-foreground">{size}px</span>
        </div>
      ))}
    </div>
  ),
};

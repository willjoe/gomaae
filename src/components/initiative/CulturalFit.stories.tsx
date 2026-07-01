import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import CulturalFit, { EMPTY_CULTURAL_FIT, type CulturalFitData } from './CulturalFit';
import { LifecycleProvider } from '@/context/LifecycleContext';

const meta: Meta<typeof CulturalFit> = {
  title: 'Organisms/Initiative/CulturalFit',
  component: CulturalFit,
  decorators: [
    (Story) => (
      <LifecycleProvider>
        <div className="p-8 bg-background min-h-screen max-w-2xl">
          <Story />
        </div>
      </LifecycleProvider>
    ),
  ],
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof CulturalFit>;

export const Empty: Story = {
  render: () => {
    const [data, setData] = useState<CulturalFitData>(EMPTY_CULTURAL_FIT);
    return <CulturalFit data={data} onChange={setData} />;
  },
};

export const WithData: Story = {
  render: () => {
    const [data, setData] = useState<CulturalFitData>({
      teamEnthusiasm: 'The team is genuinely excited about improving developer workflows through AI automation.',
      coreValues: ['Engineering excellence', 'Customer empathy', 'Continuous improvement'],
      internalChampion: 'Alice (VP Engineering) — committed to reducing manual overhead for the dev team.',
      riskAppetite: 'medium',
      brandFit: 'Aligns with our positioning as an AI-forward development platform.',
    });
    return (
      <CulturalFit
        data={data}
        onChange={setData}
        sectionScores={{
          values: { score: 78, feedback: 'Strong alignment with core engineering values.' },
          org: { score: 82, feedback: 'Clear champion and well-understood risk tolerance.' },
        }}
      />
    );
  },
};

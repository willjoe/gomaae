import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { axe } from 'vitest-axe';
import * as matchers from 'vitest-axe/matchers';
import { composeStories } from '@storybook/react';

expect.extend(matchers);

// Mock fetch for relative URLs in JSDOM environment
if (typeof window !== 'undefined') {
  global.fetch = vi.fn().mockImplementation(() => {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ success: true, tickets: [], projects: [], config: {} }),
    });
  });
}

/**
 * Universal Test Module
 * 
 * This module is the "Single Source of Truth" for component testing.
 * It takes Storybook stories and runs them as Vitest tests.
 * 
 * It automatically follows Storybook's "Interactions" (the .play() function).
 */
export function runStandardSuite(storiesImport: any | any[]) {
  const imports = Array.isArray(storiesImport) ? storiesImport : [storiesImport];

  imports.forEach((storiesFile) => {
    // composeStories converts Storybook stories into standard React components
    // while keeping their .args and .play functions intact.
    const composed = composeStories(storiesFile);
    const componentName = storiesFile.default?.title?.split('/').pop() || 'Component';

    describe(`Universal Suite: ${componentName}`, () => {
      Object.keys(composed).forEach((key) => {
        const Story = (composed as any)[key];
        
        // Only test actual story exports
        if (typeof Story !== 'function' || !Story.storyName) return;

        describe(`Story: ${Story.storyName}`, () => {
          
          it('should pass A11y and execute Storybook Interactions', async () => {
            const { container } = render(<Story />);
            
            // 1. Accessibility (A11y) - Runs the same engine as the Storybook A11y addon
            const results = await axe(container);
            expect(results).toHaveNoViolations();

            // 2. Storybook Interactions (.play function)
            // This is the core of your request: The EXACT same interaction code
            // you see in the Storybook UI's "Interactions" tab is executed here.
            if (Story.play) {
              // We pass the rendered container as the 'canvasElement'
              // Storybook's 'within(canvasElement)' will then work perfectly.
              await Story.play({ canvasElement: container });
            }
          });

          it('should match DOM snapshot', () => {
            const { container } = render(<Story />);
            // 3. Structural Snapshot
            expect(container.firstChild).toMatchSnapshot();
          });
        });
      });
    });
  });
}

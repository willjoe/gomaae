import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import { playwright } from '@vitest/browser-playwright';

const dirname = typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    projects: [
      {
        name: 'unit',
        resolve: {
          alias: {
            '@': path.resolve(dirname, 'src'),
          },
        },
        test: {
          environment: 'jsdom',
          globals: true,
          include: ['src/**/*.test.{ts,tsx}'],
        },
      },
      {
        extends: true,
        plugins: [
          storybookTest({ configDir: path.join(dirname, '.storybook') }),
        ],
        resolve: {
          alias: {
            '@': path.resolve(dirname, 'src'),
          },
        },
        test: {
          name: 'storybook',
          globals: true,
          browser: {
            enabled: true,
            headless: true,
            provider: playwright({
              contextOptions: {
                recordVideo: {
                  dir: path.resolve(dirname, '../DocsAssets/Evidence/Visual-Raw-Results'),
                  size: { width: 1280, height: 720 },
                },
              },
            }),
            instances: [{ browser: 'chromium' }],
          },
        },
      },
    ],
  },
});

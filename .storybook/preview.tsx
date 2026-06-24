import type { Preview } from '@storybook/nextjs-vite'
import React, { useEffect } from 'react';
import '../src/app/globals.css';
import { LifecycleProvider, useLifecycle } from '../src/context/LifecycleContext';

/**
 * Bridge component that synchronizes Storybook's toolbar locale with our app's LifecycleContext.
 * This ensures the t() function uses the correct existing localization config.
 */
const LanguageSync = ({ children, locale }: { children: React.ReactNode, locale: string }) => {
  const { updateLanguage } = useLifecycle();
  
  useEffect(() => {
    // Map Storybook short-codes to the application's exact translation keys
    const langKey = locale === 'ja' ? 'Japanese (日本語)' : 'English';
    updateLanguage(langKey);
  }, [locale, updateLanguage]);

  return <>{children}</>;
};

const preview: Preview = {
  globalTypes: {
    theme: {
      name: 'Theme',
      description: 'Global theme for components',
      defaultValue: 'light',
      toolbar: {
        icon: 'circlehollow',
        items: [
          { value: 'light', icon: 'circlehollow', title: 'Light' },
          { value: 'dark', icon: 'circle', title: 'Dark' },
        ],
        showName: true,
      },
    },
    locale: {
      name: 'Locale',
      description: 'Internationalization locale',
      defaultValue: 'en',
      toolbar: {
        icon: 'globe',
        items: [
          { value: 'en', right: '🇺🇸', title: 'English' },
          { value: 'ja', right: '🇯🇵', title: '日本語' },
        ],
        showName: true,
      },
    },
  },
  parameters: {
    controls: {
      matchers: {
       color: /(background|color)$/i,
       date: /Date$/i,
      },
    },
    backgrounds: {
      disable: true,
    },
    a11y: {
      test: 'todo'
    },
    // The whole app uses the Next.js App Router, so mount the mocked app router
    // for every story. Without this, any component calling next/navigation hooks
    // (useRouter / usePathname) throws "invariant expected app router to be mounted".
    nextjs: {
      appDirectory: true,
    },
  },
  decorators: [
    (Story, context) => {
      const theme = context.globals.theme || 'light';
      const locale = context.globals.locale || 'en';
      
      useEffect(() => {
        const html = window.document.documentElement;
        html.classList.remove('light', 'dark');
        html.classList.add(theme);
        
        document.body.style.backgroundColor = theme === 'dark' ? '#020617' : '#f8fafc';
        document.body.style.color = theme === 'dark' ? '#f8fafc' : '#0f172a';
      }, [theme]);

      return (
        <LifecycleProvider>
          <LanguageSync locale={locale}>
            <div className="font-sans antialiased" style={{ minHeight: '100vh', padding: '2rem' }}>
              <Story />
            </div>
          </LanguageSync>
        </LifecycleProvider>
      );
    },
  ],
};

export default preview;
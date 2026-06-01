'use client';

import React, { useEffect, useState } from 'react';
import { Save, Globe, Palette, Moon, Sun, Monitor } from 'lucide-react';
import SettingsSection from '@/components/SettingsSection';
import { useLifecycle } from '@/context/LifecycleContext';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function SettingsPage() {
  const { language, updateLanguage, appearance, updateAppearance, t } = useLifecycle();
  const [saving, setSaving] = useState(false);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language, appearance })
      });
      if ((await res.json()).success) {
        alert(t('save_settings') + ' Success');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const appearanceOptions = [
    { id: 'light', label: 'Light', icon: <Sun size={18} /> },
    { id: 'dark', label: 'Dark', icon: <Moon size={18} /> },
    { id: 'system', label: 'System', icon: <Monitor size={18} /> },
  ];

  return (
    <div className="p-8 space-y-8 h-full overflow-y-auto custom-scrollbar font-sans text-left">
      <header>
        <h1 className="text-3xl font-bold italic tracking-tight text-blue-500 underline decoration-blue-500/20 underline-offset-8 decoration-4">{t('settings')}</h1>
        <p className="text-muted-foreground mt-2">Manage your global platform preferences.</p>
      </header>

      <div className="max-w-4xl space-y-16 pb-32">
        <SettingsSection 
          title="Appearance"
          description="Customize the look and feel of the platform. Choose between light, dark, or follow your system settings."
          icon={<Palette size={24} />}
          themeColor="text-purple-500"
        >
           <div className="grid grid-cols-3 gap-4">
              {appearanceOptions.map((opt) => (
                <button 
                  key={opt.id}
                  onClick={() => updateAppearance(opt.id as any)}
                  className={cn(
                    "flex flex-col items-center justify-center p-6 rounded-2xl border-2 transition-all space-y-3",
                    appearance === opt.id 
                      ? "bg-purple-500/10 border-purple-500 text-purple-600 dark:text-purple-400" 
                      : "bg-card border-border text-muted-foreground hover:border-purple-500/50 hover:bg-muted/50"
                  )}
                >
                   {opt.icon}
                   <span className="text-xs font-bold uppercase tracking-widest">{opt.label}</span>
                </button>
              ))}
           </div>
        </SettingsSection>

        <SettingsSection 
          title={t('localization')}
          description="Select your preferred interface language. AI Agents will adapt their communication style to this locale."
          icon={<Globe size={24} />}
          themeColor="text-blue-500"
        >
          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-1">{t('interface_language')}</label>
              <select 
                value={language}
                onChange={(e) => updateLanguage(e.target.value)}
                className="w-full bg-card border border-border rounded-xl px-4 py-3 text-sm text-foreground focus:ring-2 focus:ring-blue-500/40 outline-none transition-all cursor-pointer font-sans"
              >
                <option>English</option>
                <option>Japanese (日本語)</option>
                <option>French (Français)</option>
                <option>Spanish (Español)</option>
              </select>
            </div>
            <div className="space-y-2 opacity-50">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-1">Timezone</label>
              <div className="w-full bg-muted/50 border border-border rounded-xl px-4 py-3 text-sm text-muted-foreground italic">
                Detected: UTC -08:00 (Pacific Time)
              </div>
            </div>
          </div>
        </SettingsSection>

        <div className="flex justify-end pt-8 border-t border-border">
          <button 
            onClick={handleSaveConfig}
            disabled={saving}
            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-500 disabled:bg-muted text-white px-12 py-4 rounded-2xl font-bold transition-all shadow-xl active:scale-95 shadow-blue-500/20"
          >
            <Save size={18} />
            <span>{saving ? '...' : t('save_settings')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

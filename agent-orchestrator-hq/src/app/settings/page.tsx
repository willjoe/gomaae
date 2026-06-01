'use client';

import React, { useEffect, useState } from 'react';
import { Save, Globe } from 'lucide-react';
import SettingsSection from '@/components/SettingsSection';
import { useLifecycle } from '@/context/LifecycleContext';

export default function SettingsPage() {
  const { language, updateLanguage, t } = useLifecycle();
  const [saving, setSaving] = useState(false);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language })
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

  return (
    <div className="p-8 space-y-8 h-full overflow-y-auto custom-scrollbar font-sans">
      <header>
        <h1 className="text-3xl font-bold italic tracking-tight text-blue-400 underline decoration-blue-600/30 underline-offset-8 decoration-4">{t('settings')}</h1>
        <p className="text-slate-400 mt-2">Manage your global platform preferences.</p>
      </header>

      <div className="max-w-4xl space-y-16 pb-32">
        <SettingsSection 
          title={t('localization')}
          description="Select your preferred interface language. AI Agents will adapt their communication style to this locale."
          icon={<Globe size={24} />}
          themeColor="text-blue-400"
        >
          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">{t('interface_language')}</label>
              <select 
                value={language}
                onChange={(e) => updateLanguage(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 focus:ring-2 focus:ring-blue-500/40 outline-none transition-all cursor-pointer font-sans"
              >
                <option>English</option>
                <option>Japanese (日本語)</option>
                <option>French (Français)</option>
                <option>Spanish (Español)</option>
              </select>
            </div>
            <div className="space-y-2 opacity-50">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Timezone</label>
              <div className="w-full bg-slate-900/50 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-500 italic">
                Detected: UTC -08:00 (Pacific Time)
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-800/50">
            <button 
              onClick={handleSaveConfig}
              disabled={saving}
              className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-lg active:scale-95 shadow-blue-900/20"
            >
              <Save size={18} />
              <span>{saving ? '...' : t('save_settings')}</span>
            </button>
          </div>
        </SettingsSection>
      </div>
    </div>
  );
}

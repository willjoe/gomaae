'use client';

import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface SettingsSectionProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  themeColor: string;
  children: React.ReactNode;
}

export default function SettingsSection({
  title,
  description,
  icon,
  themeColor,
  children
}: SettingsSectionProps) {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className={cn("flex items-center space-x-3 border-b border-slate-800 pb-2", themeColor)}>
        {icon}
        <h2 className="text-xl font-bold italic">{title}</h2>
      </div>
      <p className="text-sm text-slate-500 italic">{description}</p>
      
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-8 space-y-6 shadow-2xl">
        {children}
      </div>
    </div>
  );
}

'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { FileText, File as FileIcon, X, Maximize2, Download } from 'lucide-react';
import { cn } from '@/lib/cn';


interface DocumentPreviewProps {
  doc: {
    name: string;
    type: 'markdown' | 'pdf';
    content?: string;
    url?: string;
  };
  onClose: () => void;
}

export default function DocumentPreview({ doc, onClose }: DocumentPreviewProps) {
  if (!doc) return null;

  return (
    <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-2xl flex flex-col h-[600px] animate-in slide-in-from-bottom-4 duration-300 transition-colors duration-300">
      {/* Header */}
      <div className="px-6 py-4 bg-muted/20 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-3 text-foreground font-bold italic tracking-tight">
          <FileText size={18} className="text-blue-500" />
          <span>{doc.name}</span>
          <span className="text-[10px] bg-muted px-2 py-0.5 rounded text-muted-foreground uppercase font-mono">{doc.type}</span>
        </div>
        <div className="flex items-center gap-2">
           <button className="p-2 hover:bg-muted rounded-full text-muted-foreground hover:text-foreground transition-colors">
              <Download size={16} />
           </button>
           <button 
             onClick={onClose}
             className="p-2 hover:bg-muted rounded-full text-muted-foreground hover:text-foreground transition-colors"
           >
              <X size={20} />
           </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto bg-card p-8 custom-scrollbar">
        {doc.type === 'markdown' ? (
          <article className="prose dark:prose-invert max-w-none prose-slate prose-headings:italic prose-headings:tracking-tighter">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {doc.content || '# Document Empty'}
            </ReactMarkdown>
          </article>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center space-y-6 text-muted-foreground bg-muted/20 rounded-2xl border-2 border-dashed border-border">
             <div className="relative">
                <FileIcon size={64} className="opacity-20" />
                <div className="absolute inset-0 flex items-center justify-center">
                   <span className="text-xs font-bold bg-blue-600 text-white px-2 py-0.5 rounded shadow-lg">PDF</span>
                </div>
             </div>
             <div className="text-center space-y-2">
                <p className="font-bold text-foreground opacity-80">PDF Preview Native Handler</p>
                <p className="text-xs max-w-xs leading-relaxed italic uppercase tracking-widest opacity-50">Browser-integrated PDF viewer required to render {doc.name}</p>
             </div>
             <button className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-xl text-xs font-bold transition-all shadow-lg shadow-blue-900/40 uppercase tracking-widest">
                Open in Fullscreen
             </button>
          </div>
        )}
      </div>
    </div>
  );
}

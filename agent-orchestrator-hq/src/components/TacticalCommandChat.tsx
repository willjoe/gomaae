'use client';

import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Send, User, Bot, Loader2 } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useLifecycle } from '@/context/LifecycleContext';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface TacticalCommandChatProps {
  phaseId: string;
}

export default function TacticalCommandChat({ phaseId }: TacticalCommandChatProps) {
  const { t, phaseStates, sendMessage } = useLifecycle();
  const [isChatFocused, setIsChatFocused] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [isSending, setIsSending] = useState(false);

  const chatScrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const messages = phaseStates[phaseId]?.messages || [];

  useEffect(() => {
    if (isChatFocused && chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [isChatFocused, messages, isSending]);

  // Click-outside detection
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsChatFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleChatSend = async () => {
    if (!chatInput.trim() || isSending) return;
    
    const content = chatInput;
    setChatInput('');
    setIsSending(true);
    
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    
    try {
        await sendMessage(phaseId, content);
    } finally {
        setIsSending(false);
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setChatInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
  };

  return (
    <div 
      ref={containerRef}
      className="bg-card border border-border rounded-2xl shadow-2xl relative flex flex-col font-sans text-left z-[80] transition-colors duration-300"
    >
      {/* Chat Conversation Overlay */}
      {isChatFocused && (messages.length > 0 || isSending) && (
        <div 
          ref={chatScrollRef}
          className="absolute bottom-full left-0 right-0 max-h-[300px] mb-2 bg-card border border-border rounded-2xl overflow-y-auto custom-scrollbar p-4 space-y-4 shadow-[0_32px_64px_rgba(0,0,0,0.3)] dark:shadow-[0_32px_64px_rgba(0,0,0,0.9)] animate-in fade-in zoom-in-95 duration-200 z-50 ring-1 ring-black/5 dark:ring-white/10"
        >
          {messages.map((m: any) => (
            <div key={m.id} className={cn("flex flex-col gap-1", m.role === 'user' ? "items-end" : "items-start")}>
               <div className={cn("flex items-center gap-2 mb-1", m.role === 'user' ? "flex-row-reverse" : "flex-row")}>
                  <div className={cn("p-1 rounded bg-muted border border-border", m.role === 'user' ? "text-blue-600 dark:text-blue-400" : "text-amber-600 dark:text-amber-500")}>
                     {m.role === 'user' ? <User size={10} /> : <Bot size={10} />}
                  </div>
                  <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-tighter">{m.timestamp}</span>
               </div>
               <div className={cn(
                 "max-w-[85%] p-3 rounded-2xl text-[11px] leading-relaxed shadow-sm",
                 m.role === 'user' ? "bg-blue-600/10 text-foreground border border-blue-500/20 rounded-tr-none" : "bg-muted text-foreground border border-border rounded-tl-none"
               )}>
                  <ReactMarkdown 
                    remarkPlugins={[remarkGfm]}
                    components={{
                      p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />,
                      ul: ({node, ...props}) => <ul className="list-disc pl-4 mb-2" {...props} />,
                      ol: ({node, ...props}) => <ol className="list-decimal pl-4 mb-2" {...props} />,
                      code: ({node, ...props}) => <code className="bg-background/50 px-1 rounded font-mono text-[10px]" {...props} />,
                      pre: ({node, ...props}) => <pre className="bg-background/50 p-2 rounded-lg font-mono text-[10px] overflow-x-auto mb-2 custom-scrollbar" {...props} />,
                      a: ({node, ...props}) => <a className="text-blue-500 underline" target="_blank" rel="noreferrer" {...props} />,
                      strong: ({node, ...props}) => <strong className="font-bold" {...props} />,
                    }}
                  >
                    {m.content}
                  </ReactMarkdown>
               </div>
            </div>
          ))}

          {isSending && (
            <div className="flex flex-col gap-1 items-start">
               <div className="flex items-center gap-2 mb-1">
                  <div className="p-1 rounded bg-blue-600/10 dark:bg-blue-500/20 border border-blue-500/20 text-blue-600 dark:text-blue-400">
                     <Bot size={10} />
                  </div>
                  <span className="text-[8px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-tighter italic animate-pulse">Thinking...</span>
               </div>
               <div className="bg-muted text-foreground border border-border p-3 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-2">
                  <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 bg-blue-600 dark:bg-blue-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <div className="w-1.5 h-1.5 bg-blue-600 dark:bg-blue-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <div className="w-1.5 h-1.5 bg-blue-600 dark:bg-blue-400 rounded-full animate-bounce" />
                  </div>
               </div>
            </div>
          )}
        </div>
      )}

      {/* Chat Input Area */}
      <div className="p-3 flex items-end gap-2 relative z-60 bg-card rounded-b-2xl">
        <div className="relative flex-1 text-left">
           <textarea 
             ref={textareaRef}
             rows={1}
             placeholder={t('chat_placeholder')}
             value={chatInput}
             onFocus={() => setIsChatFocused(true)}
             onChange={handleTextareaChange}
             onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleChatSend();
                }
             }}
             className="w-full bg-muted/30 border border-border rounded-xl pl-4 pr-10 py-2.5 text-[10px] text-foreground outline-none focus:ring-2 focus:ring-blue-500/20 transition-all resize-none italic custom-scrollbar"
           />
           <button 
             onClick={handleChatSend}
             disabled={!chatInput.trim() || isSending}
             className="absolute right-2 bottom-2 p-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-400 dark:disabled:bg-slate-800 text-white disabled:text-white/60 rounded-lg transition-all active:scale-90 flex items-center justify-center"
           >
              {isSending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
           </button>
        </div>
      </div>
    </div>
  );
}

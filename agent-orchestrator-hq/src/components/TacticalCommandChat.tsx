'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Send, User, Bot, MessageSquare } from 'lucide-react';
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

  const chatScrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const messages = phaseStates[phaseId]?.messages || [];

  useEffect(() => {
    if (isChatFocused && chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [isChatFocused, messages]);

  const handleChatSend = () => {
    if (!chatInput.trim()) return;
    sendMessage(phaseId, chatInput);
    setChatInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setChatInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl relative flex flex-col font-sans text-left z-[80]">
      {/* Chat Conversation Overlay */}
      {isChatFocused && messages.length > 0 && (
        <div 
          ref={chatScrollRef}
          className="absolute bottom-full left-0 right-0 max-h-[300px] mb-2 bg-slate-950 border border-slate-800 rounded-2xl overflow-y-auto custom-scrollbar p-4 space-y-4 shadow-[0_32px_64px_rgba(0,0,0,0.9)] animate-in fade-in zoom-in-95 duration-200 z-50 ring-1 ring-white/5"
        >
          {messages.map((m: any) => (
            <div key={m.id} className={cn("flex flex-col gap-1", m.role === 'user' ? "items-end" : "items-start")}>
               <div className={cn("flex items-center gap-2 mb-1", m.role === 'user' ? "flex-row-reverse" : "flex-row")}>
                  <div className={cn("p-1 rounded bg-slate-900 border border-slate-800", m.role === 'user' ? "text-blue-400" : "text-amber-500")}>
                     {m.role === 'user' ? <User size={10} /> : <Bot size={10} />}
                  </div>
                  <span className="text-[8px] font-bold text-slate-600 uppercase tracking-tighter">{m.timestamp}</span>
               </div>
               <div className={cn(
                 "max-w-[85%] p-3 rounded-2xl text-[11px] leading-relaxed shadow-sm",
                 m.role === 'user' ? "bg-blue-600/10 text-blue-100 border border-blue-500/20 rounded-tr-none" : "bg-slate-900 text-slate-300 border border-slate-800 rounded-tl-none"
               )}>
                  {m.content}
               </div>
            </div>
          ))}
        </div>
      )}

      {/* Chat Input Area */}
      <div className="p-3 flex items-end gap-2">
        <div className="relative flex-1">
           <textarea 
             ref={textareaRef}
             rows={1}
             placeholder={t('chat_placeholder')}
             value={chatInput}
             onFocus={() => setIsChatFocused(true)}
             onBlur={() => setTimeout(() => setIsChatFocused(false), 200)}
             onChange={handleTextareaChange}
             onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleChatSend();
                }
             }}
             className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-4 pr-10 py-2.5 text-[10px] text-slate-200 outline-none focus:ring-2 focus:ring-blue-500/20 transition-all resize-none italic custom-scrollbar"
           />
           <button 
             onClick={handleChatSend}
             disabled={!chatInput.trim()}
             className="absolute right-2 bottom-2 p-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white rounded-lg transition-all active:scale-90"
           >
              <Send size={14} />
           </button>
        </div>
      </div>
    </div>
  );
}

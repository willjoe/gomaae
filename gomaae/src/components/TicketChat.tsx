'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Bot, Send, Trash2, User } from 'lucide-react';
import { cn } from '@/lib/cn';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

interface TicketChatProps {
  ticketId: string;
  ticketIdentifier?: string;
}

export default function TicketChat({ ticketId, ticketIdentifier }: TicketChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [clearing, setClearing] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/tickets/chat?ticketId=${ticketId}`);
      const d = await r.json();
      setMessages(d.messages || []);
    } catch {}
  }, [ticketId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    setLoading(true);

    // Optimistic user bubble
    const tempId = `tmp-${Date.now()}`;
    setMessages((prev) => [...prev, { id: tempId, role: 'user', content: text, created_at: new Date().toISOString() }]);

    try {
      const r = await fetch('/api/tickets/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketId, message: text }),
      });
      const d = await r.json();
      if (d.success) {
        // Replace optimistic + add assistant reply
        await load();
      } else {
        setMessages((prev) => [
          ...prev.filter((m) => m.id !== tempId),
          { id: `err-${Date.now()}`, role: 'assistant', content: `Error: ${d.error || 'Unknown error'}`, created_at: new Date().toISOString() },
        ]);
      }
    } catch (e: any) {
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== tempId),
        { id: `err-${Date.now()}`, role: 'assistant', content: `Network error: ${e.message}`, created_at: new Date().toISOString() },
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const clear = async () => {
    if (!confirm('Clear all chat messages for this ticket?')) return;
    setClearing(true);
    try {
      await fetch(`/api/tickets/chat?ticketId=${ticketId}`, { method: 'DELETE' });
      setMessages([]);
    } finally {
      setClearing(false);
    }
  };

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <Bot size={14} className="text-blue-500" />
          <span className="text-xs font-bold text-foreground uppercase tracking-widest">
            Agent Chat
          </span>
          {ticketIdentifier && (
            <span className="text-[10px] text-muted-foreground font-mono">{ticketIdentifier}</span>
          )}
        </div>
        {messages.length > 0 && (
          <button
            onClick={clear}
            disabled={clearing}
            className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            title="Clear chat"
          >
            <Trash2 size={12} />
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
        {messages.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <Bot size={28} className="text-muted-foreground/30 mb-2" />
            <p className="text-xs text-muted-foreground/60">
              Ask the AI agent anything about this ticket
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={cn('flex gap-2', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
            {msg.role === 'assistant' && (
              <div className="shrink-0 mt-0.5 w-5 h-5 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                <Bot size={10} className="text-blue-500" />
              </div>
            )}
            <div
              className={cn(
                'max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap break-words',
                msg.role === 'user'
                  ? 'bg-blue-600 text-white rounded-br-sm'
                  : 'bg-muted text-foreground rounded-bl-sm border border-border'
              )}
            >
              {msg.content}
            </div>
            {msg.role === 'user' && (
              <div className="shrink-0 mt-0.5 w-5 h-5 rounded-full bg-muted border border-border flex items-center justify-center">
                <User size={10} className="text-muted-foreground" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex gap-2 justify-start">
            <div className="shrink-0 mt-0.5 w-5 h-5 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
              <Bot size={10} className="text-blue-500" />
            </div>
            <div className="bg-muted border border-border rounded-2xl rounded-bl-sm px-3 py-2">
              <span className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="w-1 h-1 rounded-full bg-muted-foreground/50 animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="shrink-0 border-t border-border px-3 py-2 flex gap-2 items-end">
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKey}
          placeholder="Ask about this ticket… (Enter to send)"
          rows={1}
          className="flex-1 resize-none bg-muted/40 border border-border rounded-xl px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/50 outline-none focus:ring-1 focus:ring-blue-500/30 transition-all max-h-24 overflow-y-auto"
          style={{ fieldSizing: 'content' } as any}
          disabled={loading}
        />
        <button
          onClick={send}
          disabled={loading || !input.trim()}
          className="shrink-0 p-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl transition-colors"
        >
          <Send size={13} />
        </button>
      </div>
    </div>
  );
}

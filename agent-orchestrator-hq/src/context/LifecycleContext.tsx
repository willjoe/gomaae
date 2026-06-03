'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { translations } from '@/lib/translations/index';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface LifecycleState {
  selectedTicketId: string | null;
  messages: Message[];
  filteredTicketIds: string[] | null;
  navigationHistory: string[];
  historyIndex: number;
}

interface LifecycleContextType {
  tickets: any[];
  loading: boolean;
  phaseStates: Record<string, LifecycleState>;
  language: string;
  appearance: 'light' | 'dark' | 'system';
  t: (key: string, params?: Record<string, string>) => string;
  setPhaseSelectedTicket: (phaseId: string, ticketId: string | null) => void;
  navigatePhaseHistory: (phaseId: string, direction: 'back' | 'forward') => void;
  setPhaseFilteredTickets: (phaseId: string, ticketIds: string[]) => void;
  sendMessage: (phaseId: string, content: string) => Promise<void>;
  refreshTickets: () => Promise<void>;
  updateLanguage: (lang: string) => void;
  updateAppearance: (appearance: 'light' | 'dark' | 'system') => void;
  getTicketByIdentifier: (ident: string) => any | null;
}

const LifecycleContext = createContext<LifecycleContextType | undefined>(undefined);

export function LifecycleProvider({ children, initialTickets = [] }: { children: React.ReactNode, initialTickets?: any[] }) {
  const [tickets, setTickets] = useState<any[]>(initialTickets);
  const [loading, setLoading] = useState(initialTickets.length === 0);
  const [language, setLanguage] = useState('English');
  const [appearance, setAppearance] = useState<'light' | 'dark' | 'system'>('system');
  
  const initialPhaseState: LifecycleState = { 
    selectedTicketId: null, 
    messages: [], 
    filteredTicketIds: null,
    navigationHistory: [],
    historyIndex: -1
  };

  const [phaseStates, setPhaseStates] = useState<Record<string, LifecycleState>>({
    initiative: { ...initialPhaseState },
    planning: { ...initialPhaseState },
    development: { ...initialPhaseState },
    testing: { ...initialPhaseState },
    release: { ...initialPhaseState },
    repository: { ...initialPhaseState },
    registry: { ...initialPhaseState },
    documents: { ...initialPhaseState },
    'ai-engine': { ...initialPhaseState },
    cloud: { ...initialPhaseState },
  });

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/tickets');
      if (!res.ok) {
        const text = await res.text();
        console.error(`API Error (/api/tickets): ${res.status}`, text.substring(0, 200));
        return;
      }
      const data = await res.json();
      if (data.tickets) setTickets(data.tickets);
    } catch (err) {
      console.error('LifecycleContext failed to fetch tickets:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchConfig = async () => {
    try {
      const res = await fetch('/api/config');
      if (!res.ok) {
        const text = await res.text();
        console.error(`API Error (/api/config): ${res.status}`, text.substring(0, 200));
        return;
      }
      const data = await res.json();
      if (data.success && data.config) {
        if (data.config.language) setLanguage(data.config.language);
        if (data.config.appearance) setAppearance(data.config.appearance);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchTickets();
    fetchConfig();
  }, []);

  const setPhaseSelectedTicket = (phaseId: string, ticketId: string | null) => {
    setPhaseStates(prev => {
      const currentState = prev[phaseId];
      if (currentState.selectedTicketId === ticketId) return prev;

      let newHistory = [...currentState.navigationHistory];
      let newIndex = currentState.historyIndex;

      if (ticketId === null) {
          return {
            ...prev,
            [phaseId]: { ...currentState, selectedTicketId: null }
          };
      }

      newHistory = newHistory.slice(0, newIndex + 1);
      newHistory.push(ticketId);
      newIndex = newHistory.length - 1;

      if (newHistory.length > 50) {
        newHistory.shift();
        newIndex--;
      }

      return {
        ...prev,
        [phaseId]: { 
          ...currentState, 
          selectedTicketId: ticketId,
          navigationHistory: newHistory,
          historyIndex: newIndex
        }
      };
    });
  };

  const navigatePhaseHistory = (phaseId: string, direction: 'back' | 'forward') => {
    setPhaseStates(prev => {
      const currentState = prev[phaseId];
      let newIndex = currentState.historyIndex;

      if (direction === 'back' && newIndex > 0) {
        newIndex--;
      } else if (direction === 'forward' && newIndex < currentState.navigationHistory.length - 1) {
        newIndex++;
      } else {
        return prev;
      }

      const newId = currentState.navigationHistory[newIndex];
      return {
        ...prev,
        [phaseId]: { ...currentState, selectedTicketId: newId, historyIndex: newIndex }
      };
    });
  };

  const setPhaseFilteredTickets = useCallback((phaseId: string, ticketIds: string[]) => {
    setPhaseStates(prev => ({
      ...prev,
      [phaseId]: { ...prev[phaseId], filteredTicketIds: ticketIds }
    }));
  }, []);

  const getTicketByIdentifier = useCallback((ident: string) => {
    return tickets.find(t => t.identifier === ident) || null;
  }, [tickets]);

  const sendMessage = async (phaseId: string, content: string) => {
    const userMsg: Message = {
      id: Math.random().toString(36).substr(2, 9),
      role: 'user',
      content,
      timestamp: new Date().toLocaleTimeString()
    };

    setPhaseStates(prev => ({
      ...prev,
      [phaseId]: { ...prev[phaseId], messages: [...prev[phaseId].messages, userMsg] }
    }));

    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phaseId, content })
        });
        
        const json = await response.json();
        
        if (json.success) {
            const assistantMsg: Message = {
                id: Math.random().toString(36).substr(2, 9),
                role: 'assistant',
                content: json.content,
                timestamp: new Date().toLocaleTimeString()
            };

            setPhaseStates(prev => ({
                ...prev,
                [phaseId]: { ...prev[phaseId], messages: [...prev[phaseId].messages, assistantMsg] }
            }));
        }
    } catch (err) {
        console.error('Failed to send message:', err);
    }
  };

  const t = (key: string, params?: Record<string, string>) => {
    let text = translations[language]?.[key] || translations['English'][key] || key;
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        text = text.replace(`{${k}}`, v);
      });
    }
    return text;
  };

  const updateLanguage = (lang: string) => {
    setLanguage(lang);
  };

  const updateAppearance = (app: 'light' | 'dark' | 'system') => {
    setAppearance(app);
  };

  return (
    <LifecycleContext.Provider value={{ 
      tickets, 
      loading, 
      phaseStates, 
      language,
      appearance,
      t,
      setPhaseSelectedTicket, 
      navigatePhaseHistory,
      setPhaseFilteredTickets,
      sendMessage,
      refreshTickets: fetchTickets,
      updateLanguage,
      updateAppearance,
      getTicketByIdentifier
    }}>
      {children}
    </LifecycleContext.Provider>
  );
}

export function useLifecycle() {
  const context = useContext(LifecycleContext);
  if (context === undefined) {
    throw new Error('useLifecycle must be used within a LifecycleProvider');
  }
  return context;
}

'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations } from '@/lib/translations';

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
}

interface LifecycleContextType {
  tickets: any[];
  loading: boolean;
  phaseStates: Record<string, LifecycleState>;
  language: string;
  t: (key: string, params?: Record<string, string>) => string;
  setPhaseSelectedTicket: (phaseId: string, ticketId: string | null) => void;
  setPhaseFilteredTickets: (phaseId: string, ticketIds: string[]) => void;
  sendMessage: (phaseId: string, content: string) => Promise<void>;
  refreshTickets: () => Promise<void>;
  updateLanguage: (lang: string) => void;
}

const LifecycleContext = createContext<LifecycleContextType | undefined>(undefined);

export function LifecycleProvider({ children }: { children: React.ReactNode }) {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [language, setLanguage] = useState('English');
  const [phaseStates, setPhaseStates] = useState<Record<string, LifecycleState>>({
    initiative: { selectedTicketId: null, messages: [], filteredTicketIds: null },
    planning: { selectedTicketId: null, messages: [], filteredTicketIds: null },
    development: { selectedTicketId: null, messages: [], filteredTicketIds: null },
    testing: { selectedTicketId: null, messages: [], filteredTicketIds: null },
    release: { selectedTicketId: null, messages: [], filteredTicketIds: null },
    repository: { selectedTicketId: null, messages: [], filteredTicketIds: null },
    registry: { selectedTicketId: null, messages: [], filteredTicketIds: null },
    documents: { selectedTicketId: null, messages: [], filteredTicketIds: null },
    'ai-engine': { selectedTicketId: null, messages: [], filteredTicketIds: null },
    cloud: { selectedTicketId: null, messages: [], filteredTicketIds: null },
  });

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/tickets');
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
      const data = await res.json();
      if (data.success && data.config.language) {
        setLanguage(data.config.language);
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
    setPhaseStates(prev => ({
      ...prev,
      [phaseId]: { ...prev[phaseId], selectedTicketId: ticketId }
    }));
  };

  const setPhaseFilteredTickets = (phaseId: string, ticketIds: string[]) => {
    setPhaseStates(prev => ({
      ...prev,
      [phaseId]: { ...prev[phaseId], filteredTicketIds: ticketIds }
    }));
  };

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

    // Mock LLM Response
    setTimeout(() => {
      const selectedTicketId = phaseStates[phaseId].selectedTicketId;
      const selectedTicket = tickets.find(t => t.id === selectedTicketId);
      
      let response = `I understand. I am currently assisting you in the ${phaseId} phase. `;
      if (selectedTicket) {
        response += `I have noted your request regarding this ticket (${selectedTicket.identifier}: ${selectedTicket.title}). I will update the registry accordingly.`;
      } else {
        response += `I see you haven't selected a primary ticket yet. Please select a ticket from the registry if you want me to populate specific information.`;
      }

      const assistantMsg: Message = {
        id: Math.random().toString(36).substr(2, 9),
        role: 'assistant',
        content: response,
        timestamp: new Date().toLocaleTimeString()
      };

      setPhaseStates(prev => ({
        ...prev,
        [phaseId]: { ...prev[phaseId], messages: [...prev[phaseId].messages, assistantMsg] }
      }));
    }, 1000);
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

  return (
    <LifecycleContext.Provider value={{ 
      tickets, 
      loading, 
      phaseStates, 
      language,
      t,
      setPhaseSelectedTicket, 
      setPhaseFilteredTickets,
      sendMessage,
      refreshTickets: fetchTickets,
      updateLanguage
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

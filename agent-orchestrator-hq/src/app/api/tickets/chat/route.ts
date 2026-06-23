import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { db } = require('@/lib/db');
    const { searchParams } = new URL(request.url);
    const ticketId = searchParams.get('ticketId');
    if (!ticketId) return NextResponse.json({ messages: [] });

    const messages = db.prepare(
      'SELECT id, role, content, created_at FROM ticket_chat WHERE ticket_id = ? ORDER BY created_at ASC'
    ).all(ticketId);
    return NextResponse.json({ messages });
  } catch (error: any) {
    return NextResponse.json({ messages: [], error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { db } = require('@/lib/db');
    const { generateText } = require('@/lib/ai/llm');
    const { ticketId, message } = await request.json();
    if (!ticketId || !message?.trim()) {
      return NextResponse.json({ success: false, error: 'ticketId and message required' }, { status: 400 });
    }

    const ticket = db.prepare('SELECT * FROM tickets WHERE id = ?').get(ticketId) as any;
    if (!ticket) return NextResponse.json({ success: false, error: 'Ticket not found' }, { status: 404 });

    // Persist user message
    const userId = `chat-${Math.random().toString(36).substr(2, 9)}`;
    db.prepare('INSERT INTO ticket_chat (id, ticket_id, role, content) VALUES (?, ?, ?, ?)').run(
      userId, ticketId, 'user', message.trim()
    );

    // Build history for context (last 10 turns)
    const history = db.prepare(
      'SELECT role, content FROM ticket_chat WHERE ticket_id = ? ORDER BY created_at ASC LIMIT 20'
    ).all(ticketId) as { role: string; content: string }[];

    const historyText = history
      .slice(0, -1) // exclude the message we just saved
      .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
      .join('\n');

    const systemContext = `You are an AI agent assistant embedded in the HIAD (High-Integrity Atomic Development) platform.
You are helping with this specific ticket:

Identifier: ${ticket.identifier}
Title: ${ticket.title}
Tier: ${ticket.tier}
Status: ${ticket.status}
${ticket.description ? `Description:\n${ticket.description}` : ''}
${ticket.llm_role ? `Assigned Role: ${ticket.llm_role}` : ''}

Your role is to help the user understand, plan, refine, or debug work related to this ticket.
Be concise, precise, and technical. Reference the ticket by its identifier when relevant.
${historyText ? `\nConversation so far:\n${historyText}\n` : ''}
User: ${message.trim()}`;

    const reply = await generateText(systemContext);

    // Persist assistant reply
    const assistantId = `chat-${Math.random().toString(36).substr(2, 9)}`;
    db.prepare('INSERT INTO ticket_chat (id, ticket_id, role, content) VALUES (?, ?, ?, ?)').run(
      assistantId, ticketId, 'assistant', reply
    );

    return NextResponse.json({ success: true, reply });
  } catch (error: any) {
    console.error('[API Ticket Chat POST]', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { db } = require('@/lib/db');
    const { searchParams } = new URL(request.url);
    const ticketId = searchParams.get('ticketId');
    if (!ticketId) return NextResponse.json({ success: false, error: 'ticketId required' }, { status: 400 });

    db.prepare('DELETE FROM ticket_chat WHERE ticket_id = ?').run(ticketId);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

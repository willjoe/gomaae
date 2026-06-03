import { NextResponse } from "next/server";
export const dynamic = "force-static";

export async function POST(request: Request) {
  try {
    const { db } = require('@/lib/db');
    const { semanticSearch } = require('@/lib/ai/embeddings');
    
    const { phaseId, content } = await request.json();
    
    // 1. RAG: Retrieve conceptually relevant tickets
    let relevantTickets = [];
    try {
        relevantTickets = await semanticSearch(content, 3);
    } catch (ragError: any) {
        console.warn('[Chat] Semantic search failed, falling back to registry keyword search:', ragError.message);
        relevantTickets = db.prepare('SELECT * FROM tickets WHERE tier = ? OR tier = ? LIMIT 3').all('Epic', 'Story');
    }
    
    // 2. Fetch current phase context
    const selectedTicketId = db.prepare('SELECT value FROM settings WHERE key = ?').get(`selected_ticket_${phaseId}`)?.value;
    const selectedTicket = selectedTicketId ? db.prepare('SELECT * FROM tickets WHERE id = ?').get(selectedTicketId) : null;

    // 3. Construct Context-Aware Prompt
    const context = relevantTickets.map((t: any) => 
      `[${t.identifier}] ${t.title}: ${t.description} (Status: ${t.status})`
    ).join('\n');

    const systemPrompt = `You are the Tactical Command AI for the High-Integrity Atomic Development platform.
Current Phase: ${phaseId}
${selectedTicket ? `Active Ticket Focus: [${selectedTicket.identifier}] ${selectedTicket.title}` : ''}

Conceptually Relevant Registry Nodes:
${context}

Instructions:
- Provide high-density technical advice grounded in the retrieved registry nodes.
- If a ticket is relevant, refer to it by its identifier (e.g. EPC-1002).
- Be concise and direct.`;

    // 4. Call Local LLM (Ollama)
    const ollamaHost = process.env.OLLAMA_HOST || 'http://localhost:11434';
    const response = await fetch(`${ollamaHost}/api/generate`, {
      method: 'POST',
      body: JSON.stringify({
        model: 'llama3', 
        prompt: `${systemPrompt}\n\nUser: ${content}\nAssistant:`,
        stream: false
      }),
    });

    const json = await response.json();
    
    return NextResponse.json({ 
      success: true, 
      content: json.response,
      relevantIds: relevantTickets.map((t: any) => t.id)
    });

  } catch (error: any) {
    console.error('[API Chat POST] Critical Failure:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

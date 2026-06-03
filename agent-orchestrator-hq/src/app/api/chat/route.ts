import { NextResponse } from "next/server";
export const dynamic = "force-static";

export async function POST(request: Request) {
  try {
    const { db, getActiveProjectId } = require('@/lib/db');
    const { semanticSearch } = require('@/lib/ai/embeddings');
    const projectId = getActiveProjectId();
    
    const { phaseId, content } = await request.json();
    
    // 1. RAG: Retrieve conceptually relevant tickets
    let relevantTickets = [];
    try {
        relevantTickets = await semanticSearch(content, 3);
    } catch (ragError: any) {
        console.warn('[Chat] Semantic search failed, falling back to registry keyword search:', ragError.message);
        relevantTickets = projectId 
            ? db.prepare('SELECT * FROM tickets WHERE project_id = ? AND (tier = ? OR tier = ?) LIMIT 3').all(projectId, 'Epic', 'Story')
            : [];
    }
    
    // 2. Fetch current phase context
    const selectedTicketId = projectId 
        ? db.prepare('SELECT value FROM settings WHERE key = ? AND project_id = ?').get(`selected_ticket_${phaseId}`, projectId)?.value
        : null;
    const selectedTicket = selectedTicketId ? db.prepare('SELECT * FROM tickets WHERE id = ?').get(selectedTicketId) : null;

    // 3. Fetch Default AI Engine
    const defaultEngine = projectId 
        ? db.prepare('SELECT value FROM settings WHERE key = ? AND project_id = ?').get('default_ai_engine', projectId)?.value || 'ollama'
        : 'ollama';

    // 4. Construct Context-Aware Prompt
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

    // 5. Route to Selected Engine
    let aiResponse = "No engine configured.";
    
    if (defaultEngine === 'anthropic') {
        const apiKey = db.prepare('SELECT value FROM settings WHERE key = ? AND project_id = ?').get('anthropic_api_key', projectId)?.value;
        const res = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'x-api-key': apiKey || '',
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-3-5-sonnet-20240620',
                max_tokens: 1024,
                messages: [{ role: 'user', content: `${systemPrompt}\n\nUser: ${content}` }]
            })
        });
        const data = await res.json();
        aiResponse = data.content?.[0]?.text || "Error with Anthropic API";
    } else if (defaultEngine === 'google') {
        const apiKey = db.prepare('SELECT value FROM settings WHERE key = ? AND project_id = ?').get('google_api_key', projectId)?.value;
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: `${systemPrompt}\n\nUser: ${content}` }] }]
            })
        });
        const data = await res.json();
        aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || "Error with Google API";
    } else {
        // Default: Local LLM (Ollama)
        const ollamaHost = process.env.OLLAMA_HOST || 'http://localhost:11434';
        const res = await fetch(`${ollamaHost}/api/generate`, {
            method: 'POST',
            body: JSON.stringify({
                model: 'llama3', 
                prompt: `${systemPrompt}\n\nUser: ${content}\nAssistant:`,
                stream: false
            }),
        });
        const json = await res.json();
        aiResponse = json.response;
    }
    
    return NextResponse.json({ 
      success: true, 
      content: aiResponse,
      relevantIds: relevantTickets.map((t: any) => t.id)
    });

  } catch (error: any) {
    console.error('[API Chat POST] Critical Failure:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

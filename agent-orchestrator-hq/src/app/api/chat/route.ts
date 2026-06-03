import { NextResponse } from "next/server";
export const dynamic = "force-static";
const { exec } = require("child_process");
const { promisify } = require("util");
const execPromise = promisify(exec);

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

    // 3. Fetch Default AI Engine / Model
    const defaultModelId = projectId 
        ? db.prepare('SELECT value FROM settings WHERE key = ? AND project_id = ?').get('default_ai_engine', projectId)?.value
        : null;

    // High-Integrity Check: Ensure a model is selected
    if (!defaultModelId || defaultModelId === 'null' || defaultModelId === 'undefined' || defaultModelId === '') {
        return NextResponse.json({ 
            success: true, 
            content: "No LLM model selected. Please visit the **AI Engine** page to select a default intelligence node for the Tactical Command Chat.",
            relevantIds: []
        });
    }

    // 4. Construct Context-Aware Prompt
    const contextLines = relevantTickets.map((t: any) => 
      `[${t.identifier}] ${t.title}: ${t.description} (Status: ${t.status})`
    ).join('\n');

    const systemPrompt = `You are the Tactical Command AI for the High-Integrity Atomic Development platform.
Model Identification: ${defaultModelId}
Current Phase: ${phaseId}
${selectedTicket ? `Active Ticket Focus: [${selectedTicket.identifier}] ${selectedTicket.title}` : ''}

Conceptually Relevant Registry Nodes:
${contextLines}

Instructions:
- Provide high-density technical advice grounded in the retrieved registry nodes.
- If a ticket is relevant, refer to it by its identifier (e.g. EPC-1002).
- Be concise and direct.`;

    const fullPrompt = `${systemPrompt}\n\nUser: ${content}`;

    // 5. Route to Selected Engine
    let aiResponse = "No engine configured.";
    
    if (defaultModelId.startsWith('claude')) {
        const dbKey = db.prepare('SELECT value FROM settings WHERE key = ? AND project_id = ?').get('anthropic_api_key', projectId)?.value;
        const isCli = db.prepare('SELECT value FROM settings WHERE key = ? AND project_id = ?').get('anthropic_cli_active', projectId)?.value === 'true';
        
        if (isCli) {
            try {
                // Execute direct CLI inference for Anthropic
                const escapedPrompt = fullPrompt.replace(/"/g, '\\"').replace(/`/g, '\\`');
                // Use the alias if available (sonnet/opus) otherwise use ID
                const modelFlag = defaultModelId.includes('sonnet') ? 'sonnet' : (defaultModelId.includes('opus') ? 'opus' : defaultModelId);
                const { stdout } = await execPromise(`claude -p "${escapedPrompt}" --model ${modelFlag}`);
                aiResponse = stdout.trim() || "Empty response from claude CLI";
            } catch (cliErr: any) {
                aiResponse = `Anthropic CLI Error: ${cliErr.message}. Ensure 'claude' tool is installed and logged in.`;
            }
        } else {
            const apiKey = (dbKey || process.env.ANTHROPIC_API_KEY);
            if (!apiKey || apiKey === 'cli_managed_proxy') {
                aiResponse = "Anthropic Error: API Key not found. Please configure it in the AI Engine page or set ANTHROPIC_API_KEY env var.";
            } else {
                const res = await fetch('https://api.anthropic.com/v1/messages', {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'x-api-key': apiKey,
                        'anthropic-version': '2023-06-01'
                    },
                    body: JSON.stringify({
                        model: defaultModelId.includes('sonnet') ? 'claude-3-5-sonnet-20240620' : defaultModelId,
                        max_tokens: 1024,
                        messages: [{ role: 'user', content: fullPrompt }]
                    })
                });
                const data = await res.json();
                if (data.error) aiResponse = `Anthropic Error: ${data.error.message || JSON.stringify(data.error)}`;
                else aiResponse = data.content?.[0]?.text || "Empty response from Anthropic";
            }
        }
    } else if (defaultModelId.startsWith('gemini')) {
        const dbKey = db.prepare('SELECT value FROM settings WHERE key = ? AND project_id = ?').get('google_api_key', projectId)?.value;
        const isCli = db.prepare('SELECT value FROM settings WHERE key = ? AND project_id = ?').get('google_cli_active', projectId)?.value === 'true';
        
        if (isCli) {
            try {
                // Execute direct CLI inference
                const escapedPrompt = fullPrompt.replace(/"/g, '\\"').replace(/`/g, '\\`');
                const { stdout } = await execPromise(`gemini -m ${defaultModelId} "${escapedPrompt}"`);
                aiResponse = stdout.trim() || "Empty response from gemini CLI";
            } catch (cliErr: any) {
                aiResponse = `Google CLI Error: ${cliErr.message}. Ensure 'gemini' tool is installed and logged in.`;
            }
        } else {
            const key = (dbKey || process.env.GOOGLE_API_KEY);
            if (!key || key === 'cli_managed_proxy') {
                aiResponse = "Google Error: API Key not found. Please configure it in the AI Engine page or set GOOGLE_API_KEY env var.";
            } else {
                const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${defaultModelId}:generateContent?key=${key}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: fullPrompt }] }]
                    })
                });
                const data = await res.json();
                if (data.error) aiResponse = `Google Error: ${data.error.message || JSON.stringify(data.error)}`;
                else aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || "Empty response from Google";
            }
        }
    } else if (defaultModelId.startsWith('gpt-')) {
        const dbKey = db.prepare('SELECT value FROM settings WHERE key = ? AND project_id = ?').get('openai_api_key', projectId)?.value;
        const apiKey = (dbKey || process.env.OPENAI_API_KEY);
        
        if (!apiKey) {
            aiResponse = "OpenAI Error: API Key not found. Please configure it in the AI Engine page or set OPENAI_API_KEY env var.";
        } else {
            const res = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: defaultModelId,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content }
                    ]
                })
            });
            const data = await res.json();
            if (data.error) aiResponse = `OpenAI Error: ${data.error.message || JSON.stringify(data.error)}`;
            else aiResponse = data.choices?.[0]?.message?.content || "Empty response from OpenAI";
        }
    } else if (defaultModelId.startsWith('ollama')) {
        const isCli = db.prepare('SELECT value FROM settings WHERE key = ? AND project_id = ?').get('ollama_cli_active', projectId)?.value === 'true';
        const modelName = defaultModelId.replace('ollama-', '');
        const targetModel = modelName === 'ollama' ? 'llama3' : modelName;

        if (isCli) {
            try {
                const { stdout } = await execPromise(`ollama run ${targetModel} "${fullPrompt.replace(/"/g, '\\"')}"`);
                aiResponse = stdout.trim() || "Empty response from ollama CLI";
            } catch (cliErr: any) {
                aiResponse = `Ollama CLI Error: ${cliErr.message}. Ensure 'ollama' is installed and the server is running.`;
            }
        } else {
            const ollamaHost = process.env.OLLAMA_HOST || 'http://localhost:11434';
            try {
                const res = await fetch(`${ollamaHost}/api/generate`, {
                    method: 'POST',
                    body: JSON.stringify({
                        model: targetModel, 
                        prompt: `${systemPrompt}\n\nUser: ${content}\nAssistant:`,
                        stream: false
                    }),
                });
                const json = await res.json();
                aiResponse = json.response || "No response from Ollama";
            } catch (e: any) {
                aiResponse = `Ollama Connection Error: ${e.message}. Host ${ollamaHost} unreachable.`;
            }
        }
    } else {
        aiResponse = `Unknown AI engine configuration: ${defaultModelId}. Please re-select a model in the AI Engine registry.`;
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

import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
const { exec } = require("child_process");
const { promisify } = require("util");
const execPromise = promisify(exec);

export async function POST(request: Request) {
  try {
    const { db, getActiveProjectId } = require('@/lib/db');
    const { semanticSearch } = require('@/lib/ai/embeddings');
    const projectId = getActiveProjectId();
    
    if (!projectId) {
        return NextResponse.json({ 
            success: true, 
            content: "No active project selected. Please select a project first.",
            relevantIds: []
        });
    }

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
    const selectedTicketId = db.prepare('SELECT value FROM project_settings WHERE key = ?').get(`selected_ticket_${phaseId}`)?.value;
    const selectedTicket = selectedTicketId ? db.prepare('SELECT * FROM tickets WHERE id = ?').get(selectedTicketId) : null;

    // 3. Fetch Default AI Engine / Model
    const defaultModelId = db.prepare('SELECT value FROM project_settings WHERE key = ?').get('default_ai_engine')?.value;

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

    // Dynamic Model Identity for System Prompt
    let resolvedIdentity = defaultModelId;
    if (defaultModelId.startsWith('claude')) {
        resolvedIdentity = defaultModelId.includes('sonnet') ? 'Claude Sonnet' : (defaultModelId.includes('opus') ? 'Claude Opus' : 'Claude');
    } else if (defaultModelId.startsWith('gemini')) {
        resolvedIdentity = 'Antigravity (Google)';
    }

    const systemPrompt = `You are the Tactical Command AI for the High-Integrity Atomic Development platform.
Model Identification: ${resolvedIdentity}
Current Phase: ${phaseId}
${selectedTicket ? `Active Ticket Focus: [${selectedTicket.identifier}] ${selectedTicket.title}` : ''}

Conceptually Relevant Registry Nodes:
${contextLines}

Instructions:
- Provide high-density technical advice grounded in the retrieved registry nodes.
- If a ticket is relevant, refer to it by its identifier (e.g. EPC-1002).
- Use Markdown formatting for clarity.
- Be concise and direct.`;

    const fullPrompt = `${systemPrompt}\n\nUser: ${content}`;

    // 5. Route to Selected Engine
    let aiResponse = "No engine configured.";
    
    if (defaultModelId.startsWith('claude')) {
        const dbKey = db.prepare('SELECT value FROM project_settings WHERE key = ?').get('anthropic_api_key')?.value;
        const isCli = db.prepare('SELECT value FROM project_settings WHERE key = ?').get('anthropic_cli_active')?.value === 'true';
        
        if (isCli) {
            try {
                const escapedPrompt = fullPrompt.replace(/"/g, '\\"').replace(/`/g, '\\`');
                const modelFlag = defaultModelId.includes('sonnet') ? 'sonnet' : (defaultModelId.includes('opus') ? 'opus' : defaultModelId);
                const { stdout } = await execPromise(`claude -p "${escapedPrompt}" --model ${modelFlag}`);
                aiResponse = stdout.trim() || "Empty response from claude CLI";
            } catch (cliErr: any) {
                const msg = cliErr.message || "";
                if (msg.includes('429') || msg.toLowerCase().includes('quota') || msg.toLowerCase().includes('exhausted')) {
                    aiResponse = "Maximum Quota Reached (Anthropic).";
                } else {
                    aiResponse = `Anthropic CLI Error: ${msg}`;
                }
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
                if (data.error) {
                    const msg = data.error.message || JSON.stringify(data.error);
                    if (msg.toLowerCase().includes('quota') || msg.toLowerCase().includes('exhausted')) {
                        aiResponse = "Maximum Quota Reached (Anthropic).";
                    } else {
                        aiResponse = `Anthropic Error: ${msg}`;
                    }
                } else aiResponse = data.content?.[0]?.text || "Empty response from Anthropic";
            }
        }
    } else if (defaultModelId.startsWith('gemini')) {
        const dbKey = db.prepare('SELECT value FROM project_settings WHERE key = ?').get('google_api_key')?.value;
        const isCli = db.prepare('SELECT value FROM project_settings WHERE key = ?').get('google_cli_active')?.value === 'true';
        
        if (isCli) {
            try {
                const escapedPrompt = fullPrompt.replace(/"/g, '\\"').replace(/`/g, '\\`');
                const { stdout } = await execPromise(`agy --model ${defaultModelId} --prompt "${escapedPrompt}" --dangerously-skip-permissions`);
                aiResponse = stdout.trim() || "Empty response from Antigravity CLI";
            } catch (cliErr: any) {
                const msg = cliErr.message || "";
                if (msg.includes('429') || msg.toLowerCase().includes('quota') || msg.toLowerCase().includes('exhausted')) {
                    aiResponse = "Maximum Quota Reached (Antigravity).";
                } else {
                    aiResponse = `Antigravity CLI Error: ${msg}`;
                }
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
                if (data.error) {
                    const msg = data.error.message || JSON.stringify(data.error);
                    if (data.error.code === 429 || msg.toLowerCase().includes('quota') || msg.toLowerCase().includes('exhausted')) {
                        aiResponse = "Maximum Quota Reached (Antigravity).";
                    } else {
                        aiResponse = `Google Error: ${msg}`;
                    }
                } else {
                    aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || "Empty response from Google";
                }
            }
        }
    } else if (defaultModelId.startsWith('gpt-')) {
        const dbKey = db.prepare('SELECT value FROM project_settings WHERE key = ?').get('openai_api_key')?.value;
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
            if (data.error) {
                const msg = data.error.message || JSON.stringify(data.error);
                if (msg.toLowerCase().includes('quota') || msg.toLowerCase().includes('exhausted')) {
                    aiResponse = "Maximum Quota Reached (OpenAI).";
                } else {
                    aiResponse = `OpenAI Error: ${msg}`;
                }
            } else aiResponse = data.choices?.[0]?.message?.content || "Empty response from OpenAI";
        }
    } else if (defaultModelId.startsWith('ollama')) {
        const isCli = db.prepare('SELECT value FROM project_settings WHERE key = ?').get('ollama_cli_active')?.value === 'true';
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

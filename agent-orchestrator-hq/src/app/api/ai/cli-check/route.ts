import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";

const execPromise = promisify(exec);

export async function POST(request: Request) {
  try {
    const { provider } = await request.json();
    
    let command = "";
    let checkAuth = "";

    let toolName = "";

    if (provider === 'google') {
      toolName = "gemini";
      command = "gemini --version";
      checkAuth = "gemini auth status"; // Assuming gemini CLI has a status check
    } else if (provider === 'ollama') {
      toolName = "ollama";
      command = "ollama --version";
      checkAuth = "ollama list"; // Using list as a proxy for 'server running and reachable'
    } else if (provider === 'anthropic') {
      toolName = "node (proxy)";
      command = "node -v";
    } else {
      return NextResponse.json({ success: false, error: "Unsupported provider for CLI check" });
    }

    try {
      const { stdout } = await execPromise(command);
      let authStatus = "Ready";
      
      if (checkAuth) {
        try {
          const { stdout: authOut } = await execPromise(checkAuth);
          if (provider === 'google') {
             authStatus = authOut.toLowerCase().includes('logged in') ? "Authenticated" : "Not logged in";
          } else if (provider === 'ollama') {
             authStatus = "Server Operational";
          }
        } catch (e) {
          authStatus = "Authorization Required";
        }
      }

      return NextResponse.json({ 
        success: true, 
        installed: true, 
        toolName,
        version: stdout.trim().split('\n')[0],
        authStatus 
      });
    } catch (e: any) {
      return NextResponse.json({ 
        success: true, 
        installed: false, 
        error: `CLI tool not found: ${e.message}` 
      });
    }

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

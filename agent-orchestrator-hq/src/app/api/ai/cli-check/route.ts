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
      toolName = "claude";
      command = "claude --version";
      checkAuth = "claude auth status";
    } else {
      return NextResponse.json({ success: false, error: "Unsupported provider for CLI check" });
    }

    try {
      console.log(`[CLI Check] Executing: ${command}`);
      const { stdout } = await execPromise(command, { timeout: 5000 });
      let authStatus = "Ready";
      
      if (checkAuth) {
        try {
          console.log(`[CLI Check] Checking Auth: ${checkAuth}`);
          const { stdout: authOut } = await execPromise(checkAuth, { timeout: 5000 });
          if (provider === 'google') {
             authStatus = authOut.toLowerCase().includes('logged in') ? "Authenticated" : "Not logged in";
          } else if (provider === 'ollama') {
             authStatus = "Server Operational";
          } else if (provider === 'anthropic') {
             authStatus = authOut.toLowerCase().includes('logged in') ? "Authenticated" : "Ready";
          }
        } catch (e: any) {
          console.warn(`[CLI Check] Auth check failed or timed out: ${e.message}`);
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

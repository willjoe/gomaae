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
      toolName = "Gemini";
      command = "gemini --version";
      checkAuth = "gemini auth status";
    } else if (provider === 'ollama') {
      toolName = "Ollama";
      command = "ollama --version";
      checkAuth = "ollama list";
    } else if (provider === 'anthropic') {
      toolName = "Claude";
      command = "claude --version";
      checkAuth = "claude auth status";
    } else {
      return NextResponse.json({ success: false, error: "Unsupported provider for CLI check" });
    }

    try {
      console.log(`[CLI Check] Executing: ${command}`);
      const { stdout } = await execPromise(command, { timeout: 5000 });
      let authStatus = "Ready";
      
      // Clean up version string by removing ASCII art/logo lines
      const versionLine = stdout.split('\n').find(line => line.toLowerCase().includes('v') || line.match(/\d+\.\d+/));
      const cleanVersion = versionLine ? versionLine.trim().replace(/^[^a-zA-Z0-9]+/, '') : stdout.trim().split('\n')[0];

      if (checkAuth) {
        try {
          console.log(`[CLI Check] Checking Auth: ${checkAuth}`);
          const { stdout: authOut } = await execPromise(checkAuth, { timeout: 5000 });
          const outLower = authOut.toLowerCase();
          
          if (provider === 'google') {
             // Gemini CLI uses "Signed in" or "Logged in"
             authStatus = (outLower.includes('logged in') || outLower.includes('signed in')) ? "Authenticated" : "Not logged in";
          } else if (provider === 'ollama') {
             authStatus = "Server Operational";
          } else if (provider === 'anthropic') {
             authStatus = (outLower.includes('logged in') || outLower.includes('authenticated')) ? "Authenticated" : "Not logged in";
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
        version: cleanVersion,
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

import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

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
      // `gemini auth status` is not a valid subcommand — it spawns an agent session.
      // Auth is determined by the presence of ~/.gemini/oauth_creds.json instead.
      checkAuth = "";
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

      // Gemini: check OAuth credentials file directly (the CLI has no auth status subcommand).
      if (provider === 'google') {
        const credsPath = path.join(os.homedir(), '.gemini', 'oauth_creds.json');
        authStatus = fs.existsSync(credsPath) ? "Authenticated" : "Authorization Required";
      } else if (checkAuth) {
        try {
          console.log(`[CLI Check] Checking Auth: ${checkAuth}`);
          const { stdout: authOut } = await execPromise(checkAuth, { timeout: 5000 });
          const outLower = authOut.toLowerCase();

          if (provider === 'ollama') {
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

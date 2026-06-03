import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";

const execPromise = promisify(exec);

export async function POST(request: Request) {
  try {
    const { provider } = await request.json();
    
    let command = "";
    let checkAuth = "";

    if (provider === 'google') {
      command = "gcloud version";
      checkAuth = "gcloud auth list --filter=status:ACTIVE --format='value(account)'";
    } else if (provider === 'ollama') {
      command = "ollama --version";
    } else if (provider === 'anthropic') {
      // Anthropic doesn't have a standard CLI, checking for 'hiad' or node version as proxy for local setup
      command = "node -v";
    } else {
      return NextResponse.json({ success: false, error: "Unsupported provider for CLI check" });
    }

    try {
      const { stdout } = await execPromise(command);
      let authStatus = "Installed";
      
      if (checkAuth) {
        try {
          const { stdout: authOut } = await execPromise(checkAuth);
          authStatus = authOut.trim() ? `Authenticated as ${authOut.trim()}` : "Not logged in";
        } catch (e) {
          authStatus = "Not logged in";
        }
      }

      return NextResponse.json({ 
        success: true, 
        installed: true, 
        version: stdout.trim(),
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

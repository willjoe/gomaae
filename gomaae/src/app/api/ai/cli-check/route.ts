import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

const execPromise = promisify(exec);

/**
 * The bundled sidecar inherits only the OS minimal PATH (/usr/bin:/bin:…),
 * not the user's shell PATH. Prepend every common macOS install location so
 * `agy`, `ollama`, `claude`, etc. are found regardless of how they were installed.
 */
function expandedEnv(): NodeJS.ProcessEnv {
  const home = os.homedir();
  const extra = [
    '/opt/homebrew/bin',        // Homebrew – Apple Silicon
    '/opt/homebrew/sbin',
    '/usr/local/bin',           // Homebrew – Intel, misc installers
    '/usr/local/sbin',
    `${home}/.local/bin`,       // pip / pipx / uv user installs
    `${home}/bin`,
    `${home}/.npm-global/bin`,  // npm global (custom prefix)
    `${home}/.yarn/bin`,
    `${home}/.cargo/bin`,       // Rust / cargo installs
    '/usr/local/go/bin',
    `${home}/go/bin`,
  ];
  const base = process.env.PATH ?? '/usr/bin:/bin:/usr/sbin:/sbin';
  return { ...process.env, PATH: [...extra, base].join(':') };
}

export async function POST(request: Request) {
  try {
    const { provider } = await request.json();
    
    let command = "";
    let checkAuth = "";
    let toolName = "";

    if (provider === 'google') {
      toolName = "Antigravity";
      command = "agy --version";
      // `agy` authenticates via Google Cloud credentials / OAuth.
      // Auth is determined by the presence of cached credentials.
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
      const { stdout } = await execPromise(command, { timeout: 5000, env: expandedEnv() });
      let authStatus = "Ready";
      
      // Clean up version string by removing ASCII art/logo lines
      const versionLine = stdout.split('\n').find(line => line.toLowerCase().includes('v') || line.match(/\d+\.\d+/));
      const cleanVersion = versionLine ? versionLine.trim().replace(/^[^a-zA-Z0-9]+/, '') : stdout.trim().split('\n')[0];

      // Antigravity: check cached credentials (agy stores under ~/.gemini/antigravity-cli/)
      // Fall back to legacy Gemini CLI oauth_creds.json for partially-migrated setups.
      if (provider === 'google') {
        const agyCredsPath = path.join(os.homedir(), '.gemini', 'antigravity-cli', 'cache', 'oauth_creds.json');
        const legacyCredsPath = path.join(os.homedir(), '.gemini', 'oauth_creds.json');
        authStatus = (fs.existsSync(agyCredsPath) || fs.existsSync(legacyCredsPath)) ? "Authenticated" : "Authorization Required";
      } else if (checkAuth) {
        try {
          console.log(`[CLI Check] Checking Auth: ${checkAuth}`);
          const { stdout: authOut } = await execPromise(checkAuth, { timeout: 5000, env: expandedEnv() });
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

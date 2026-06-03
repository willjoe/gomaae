import { NextResponse } from "next/server";
export const dynamic = "force-static";
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    // Project root is 3 levels up from this API file in the agent-orchestrator-hq structure
    // But in the actual workspace it's /Users/will/Code/high-integrity-atomic-development/
    const rootPath = path.resolve(process.cwd(), '..');
    
    const getTree = (dir: string): any[] => {
      const files = fs.readdirSync(dir);
      return files.map(file => {
        if (file === 'node_modules' || file === '.git' || file === '.next') return null;
        
        const filePath = path.join(dir, file);
        const stats = fs.statSync(filePath);
        const isDirectory = stats.isDirectory();
        
        return {
          id: filePath,
          name: file,
          type: isDirectory ? 'folder' : 'file',
          children: isDirectory ? getTree(filePath) : null
        };
      }).filter(Boolean);
    };

    const tree = getTree(rootPath);
    return NextResponse.json({ success: true, tree });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message });
  }
}

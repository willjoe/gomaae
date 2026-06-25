import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import fs from 'fs';
import path from 'path';
import { getActiveRepoPath } from '@/lib/db';

export async function GET() {
  try {
    const repoPath = getActiveRepoPath();

    if (!repoPath || !fs.existsSync(repoPath)) {
       return NextResponse.json({ success: true, tree: [] });
    }

    const getTree = (dir: string): any[] => {
      const files = fs.readdirSync(dir);
      return files.map(file => {
        if (file === 'node_modules' || file === '.git' || file === '.next' || file === 'out') return null;
        
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

    const tree = getTree(repoPath);
    return NextResponse.json({ success: true, tree });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message });
  }
}

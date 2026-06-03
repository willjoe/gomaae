import { NextResponse } from "next/server";
export const dynamic = "force-static";
import fs from 'fs';
import path from 'path';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const activeProject = db.prepare('SELECT repo_path FROM projects WHERE is_active = 1 LIMIT 1').get();
    
    if (!activeProject || !activeProject.repo_path || !fs.existsSync(activeProject.repo_path)) {
       return NextResponse.json({ success: true, tree: [] });
    }

    const rootPath = activeProject.repo_path;
    
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

    const tree = getTree(rootPath);
    return NextResponse.json({ success: true, tree });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message });
  }
}

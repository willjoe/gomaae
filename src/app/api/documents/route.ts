import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import fs from 'fs';
import path from 'path';
import { db, getActiveProjectRoot } from '@/lib/db';
import { scoreBriefFile, BRIEFS_RELATIVE_PREFIX } from '@/lib/initiative-scoring';

export async function GET(request: Request) {
  try {
    const root = getActiveProjectRoot();
    if (!root) return NextResponse.json({ success: true, tree: [] });

    const docsPath = root;
    if (!fs.existsSync(docsPath)) {
        return NextResponse.json({ success: true, tree: [] });
    }

    const { searchParams } = new URL(request.url);
    const filePathParam = searchParams.get('path');

    // 1. READ FILE CONTENT
    if (filePathParam) {
        const fullPath = path.join(docsPath, filePathParam);
        if (!fs.existsSync(fullPath) || fs.statSync(fullPath).isDirectory()) {
            return NextResponse.json({ success: false, error: 'File not found' }, { status: 404 });
        }
        
        const content = fs.readFileSync(fullPath, 'utf8');
        const metadata = db.prepare('SELECT id, identifier, tier, document_name, document_type FROM tickets WHERE document_path = ?').get(filePathParam);
        
        return NextResponse.json({ 
            success: true, 
            name: path.basename(fullPath),
            content,
            metadata: metadata || null
        });
    }

    // 2. SCAN DIRECTORY TREE
    const getTree = (dir: string): any[] => {
      const files = fs.readdirSync(dir);
      return files.map(file => {
        if (file.startsWith('.')) return null;
        
        const filePath = path.join(dir, file);
        const stats = fs.statSync(filePath);
        const isDirectory = stats.isDirectory();
        
        // Relative path for frontend matching
        const relativePath = filePath.replace(docsPath, '').replace(/\\/g, '/');

        // Try to find matching ticket/document metadata in DB
        const docRecord = db.prepare('SELECT id, identifier, tier FROM tickets WHERE document_path = ?').get(relativePath);

        return {
          id: relativePath,
          name: file,
          type: isDirectory ? 'folder' : 'file',
          path: relativePath,
          metadata: docRecord || null,
          children: isDirectory ? getTree(filePath) : null
        };
      }).filter(Boolean);
    };

    const tree = getTree(docsPath);
    return NextResponse.json({ success: true, tree });
  } catch (err: any) {
    console.error('[API Documents GET] Failure:', err);
    return NextResponse.json({ success: false, error: err.message });
  }
}

/** Write a file into Files & Assets (DocsAssets), creating parent folders as needed. */
export async function POST(request: Request) {
  try {
    const root = getActiveProjectRoot();
    if (!root) return NextResponse.json({ success: false, error: 'No active workstation.' }, { status: 400 });

    const { path: relPath, content } = await request.json();
    if (!relPath) return NextResponse.json({ success: false, error: 'path is required.' }, { status: 400 });

    const docsPath = root;
    const fullPath = path.join(docsPath, relPath);

    // Guard against path traversal outside the workspace root.
    const normalized = path.resolve(fullPath);
    if (normalized !== docsPath && !normalized.startsWith(docsPath + path.sep)) {
      return NextResponse.json({ success: false, error: 'Invalid path.' }, { status: 400 });
    }

    fs.mkdirSync(path.dirname(normalized), { recursive: true });
    fs.writeFileSync(normalized, String(content ?? ''), 'utf8');

    // Score the file if it lives in Global/Briefs/ — fire-and-forget.
    const relNorm = relPath.replace(/^\//, '').replace(/\\/g, '/');
    if (relNorm.startsWith(BRIEFS_RELATIVE_PREFIX)) {
      const filename = path.basename(relPath);
      scoreBriefFile(filename).catch((e) => console.error('[Documents POST] scoring error:', e));
    }

    return NextResponse.json({ success: true, path: relPath });
  } catch (err: any) {
    console.error('[API Documents POST] Failure:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

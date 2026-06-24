import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
export const dynamic = 'force-dynamic';

const ALLOWED_TYPES = new Set([
  'image/png', 'image/jpeg', 'image/gif', 'image/webp',
  'video/mp4', 'video/webm', 'video/quicktime',
]);

function evidenceDir(workspaceRoot: string, ticketId: string): string {
  return path.join(workspaceRoot, 'Tickets', 'Evidence', ticketId);
}

export async function GET(request: Request) {
  try {
    const { db, getActiveProjectId } = require('@/lib/db');
    const { searchParams } = new URL(request.url);
    const ticketId = searchParams.get('ticketId');
    if (!ticketId) return NextResponse.json({ success: false, error: 'ticketId required' }, { status: 400 });
    if (!getActiveProjectId()) return NextResponse.json({ success: true, evidence: [] });

    const rows = db.prepare('SELECT * FROM ticket_evidence WHERE ticket_id = ? ORDER BY created_at ASC').all(ticketId);
    return NextResponse.json({ success: true, evidence: rows });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { db, getActiveProjectRoot } = require('@/lib/db');
    const { v4: uuidv4 } = require('uuid');

    const workspaceRoot = getActiveProjectRoot();
    if (!workspaceRoot) return NextResponse.json({ success: false, error: 'No active workstation' }, { status: 400 });

    const formData = await request.formData();
    const ticketId = formData.get('ticketId') as string;
    const caption = (formData.get('caption') as string) || null;
    const file = formData.get('file') as File | null;
    if (!ticketId || !file) return NextResponse.json({ success: false, error: 'ticketId and file required' }, { status: 400 });
    if (!ALLOWED_TYPES.has(file.type)) return NextResponse.json({ success: false, error: 'Only images (PNG/JPG/GIF/WEBP) and videos (MP4/WEBM/MOV) are allowed.' }, { status: 400 });

    const dir = evidenceDir(workspaceRoot, ticketId);
    fs.mkdirSync(dir, { recursive: true });

    const ext = file.name.split('.').pop() || 'bin';
    const id = `ev-${uuidv4().slice(0, 8)}`;
    const fileName = `${id}.${ext}`;
    const filePath = path.join(dir, fileName);

    const buf = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(filePath, buf);

    db.prepare('INSERT INTO ticket_evidence (id, ticket_id, file_name, file_path, file_type, caption) VALUES (?, ?, ?, ?, ?, ?)')
      .run(id, ticketId, file.name, filePath, file.type, caption);

    return NextResponse.json({ success: true, id, fileName: file.name, fileType: file.type });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { db } = require('@/lib/db');
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, error: 'id required' }, { status: 400 });

    const row = db.prepare('SELECT file_path FROM ticket_evidence WHERE id = ?').get(id) as any;
    if (row?.file_path && fs.existsSync(row.file_path)) fs.unlinkSync(row.file_path);
    db.prepare('DELETE FROM ticket_evidence WHERE id = ?').run(id);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

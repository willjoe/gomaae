import { NextResponse } from 'next/server';
import fs from 'fs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { db } = require('@/lib/db');
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return new NextResponse('id required', { status: 400 });

    const row = db.prepare('SELECT file_path, file_type, file_name FROM ticket_evidence WHERE id = ?').get(id) as any;
    if (!row) return new NextResponse('Not found', { status: 404 });
    if (!fs.existsSync(row.file_path)) return new NextResponse('File missing on disk', { status: 404 });

    const buf = fs.readFileSync(row.file_path);
    return new NextResponse(buf, {
      headers: {
        'Content-Type': row.file_type || 'application/octet-stream',
        'Content-Disposition': `inline; filename="${row.file_name}"`,
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (err: any) {
    return new NextResponse(err.message, { status: 500 });
  }
}

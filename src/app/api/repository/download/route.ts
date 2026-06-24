import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import fs from 'fs';
import path from 'path';
import { getActiveWorkstation } from '@/lib/appConfig';
const archiver = require('archiver');

export async function GET() {
  try {
    const activeProject = getActiveWorkstation();

    if (!activeProject || !activeProject.path) {
      return NextResponse.json({ success: false, error: 'No active project root configured' }, { status: 400 });
    }

    const repoPath = path.join(activeProject.path, 'Repository');
    
    if (!fs.existsSync(repoPath)) {
      return NextResponse.json({ success: false, error: 'Repository directory not found' }, { status: 404 });
    }

    const projectName = activeProject.name.toLowerCase().replace(/\s+/g, '-');
    const zipName = `${projectName}-repository.zip`;

    // Create a streaming response
    const stream = new ReadableStream({
      async start(controller) {
        const archive = archiver('zip', {
          zlib: { level: 9 } // Sets the compression level.
        });

        archive.on('data', (chunk: Buffer) => controller.enqueue(chunk));
        archive.on('end', () => controller.close());
        archive.on('error', (err: Error) => controller.error(err));

        archive.directory(repoPath, false);
        await archive.finalize();
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${zipName}"`,
      },
    });

  } catch (err: any) {
    console.error('[API Repository Download] Failure:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

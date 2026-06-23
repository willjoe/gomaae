import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

// Service registry — persisted in project_settings as 'operation_services' (JSON array).
// Each service: { id, name, type, url?, command?, description? }

function getDb() {
  const { db } = require('@/lib/db');
  return db;
}

function loadServices(db: any): any[] {
  const row = db.prepare("SELECT value FROM project_settings WHERE key = 'operation_services'").get() as any;
  if (!row) return [];
  try { return JSON.parse(row.value) || []; } catch { return []; }
}

function saveServices(db: any, services: any[]) {
  db.prepare(`
    INSERT INTO project_settings (key, value) VALUES ('operation_services', ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `).run(JSON.stringify(services));
}

export async function GET() {
  try {
    const db = getDb();
    return NextResponse.json({ services: loadServices(db) });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const db = getDb();
    const services = loadServices(db);

    if (body._delete) {
      const next = services.filter((s: any) => s.id !== body.id);
      saveServices(db, next);
      return NextResponse.json({ services: next });
    }

    const { id, name, type, url, command, description } = body;
    if (!name || !type) return NextResponse.json({ error: 'name and type are required' }, { status: 400 });

    const serviceId = id || `svc_${Date.now()}`;
    const existing = services.findIndex((s: any) => s.id === serviceId);
    const service = { id: serviceId, name, type, url: url || null, command: command || null, description: description || null };

    if (existing >= 0) services[existing] = service;
    else services.push(service);

    saveServices(db, services);
    return NextResponse.json({ service, services });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const { getActiveEnv } = require('@/lib/db');
    return NextResponse.json({ success: true, env: getActiveEnv() });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { setActiveEnv } = require('@/lib/db');
    const { env } = await request.json();
    setActiveEnv(env);
    return NextResponse.json({ success: true, env });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

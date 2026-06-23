import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { setActiveWorkstation } from '@/lib/appConfig';

export async function POST(request: Request) {
  try {
    const { projectId } = await request.json();

    setActiveWorkstation(projectId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

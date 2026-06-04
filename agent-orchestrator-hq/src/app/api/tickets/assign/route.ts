import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { db } from '@/lib/db';
import { GitService } from '@/lib/git-service';
import { DockerService } from '@/lib/docker-service';

export async function POST(request: Request) {
  try {
    const { ticketId, agentRole, llmProvider } = await request.json();

    if (!ticketId || !agentRole || !llmProvider) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 1. Update Ticket in Local DB
    db.prepare(`
      UPDATE tickets 
      SET status = 'In Progress', 
          llm_role = ?, 
          authorized_model = ?, 
          updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).run(agentRole, llmProvider, ticketId);

    // 2. Git Lifecycle: Branching
    const branchName = await GitService.setupBranchForTicket(ticketId);

    // 3. Docker Worker Spawning
    const containerId = await DockerService.spawnWorker(ticketId);

    return NextResponse.json({ 
      success: true, 
      status: 'In Progress', 
      branchName,
      containerId
    });

  } catch (error: any) {
    console.error('Assignment failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

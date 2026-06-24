import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { db } from '@/lib/db';
import { sanitizeRole } from '@/lib/agentRoles';
import { GitService } from '@/lib/git-service';
import { DockerService } from '@/lib/docker-service';

export async function POST(request: Request) {
  try {
    const { ticketId, agentRole } = await request.json();

    if (!ticketId || !agentRole) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Assigning is an explicit "run with this role" action: the role must be a real
    // role defined for this ticket's level in Agent Roles, otherwise reject it.
    const tierRow = db.prepare('SELECT tier FROM tickets WHERE id = ?').get(ticketId) as any;
    const role = sanitizeRole(agentRole, tierRow?.tier);
    if (!role) {
      return NextResponse.json(
        { error: `"${agentRole}" is not a valid role for this ticket's level.` },
        { status: 400 }
      );
    }

    // Derive model from the role's configured default_model, falling back to null
    // (which means the run route will use the system-wide AI Engine setting).
    const roleRow = db.prepare('SELECT default_model FROM agent_roles WHERE name = ?').get(role) as any;
    const resolvedModel = roleRow?.default_model || null;

    // 1. Update Ticket in Local DB
    db.prepare(`
      UPDATE tickets
      SET status = 'In Progress',
          llm_role = ?,
          authorized_model = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(role, resolvedModel, ticketId);

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

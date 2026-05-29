import sqlite3
import os
import json
from datetime import datetime

# Path to the new SQLite database
DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'ticket-manager.db')

def create_db():
    if os.path.exists(DB_PATH):
        os.remove(DB_PATH)
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Create the tickets table optimized for High-Integrity Atomic Development
    cursor.execute('''
    CREATE TABLE tickets (
        ticket_id TEXT PRIMARY KEY,
        subject TEXT,
        body_text TEXT,
        status TEXT,
        tier TEXT,
        parent_id TEXT,
        assigned_role TEXT,
        repository TEXT,
        created_at TEXT,
        updated_at TEXT,
        start_date TEXT,
        due_date TEXT,
        blocked_by TEXT,
        blocking TEXT
    )
    ''')

    # Insert sample data
    now = datetime.now().strftime('%Y-%m-%d')
    sample_data = [
        ('EPC-1000', 'Phase 2: CI/CD & Verification Loop Implementation', 'Implement GitOps and PR validation policies across all repositories.', 'In Progress', 'Epic', None, 'AI-DEVOPS-ENGINEER', 'git-workflows', now, now, now, '2026-06-15', None, None),
        
        ('STR-1001', 'Set up GitHub Actions templates', 'Create standard CI/CD pipelines for Node and Python microservices.', 'Done', 'Story', 'EPC-1000', 'AI-DEVOPS-ENGINEER', 'git-workflows', now, now, now, '2026-05-30', None, None),
        ('STR-1002', 'Implement Scoper Enforcement Gate', 'Build the PR verification loop script that audits token usage and codebase impact.', 'In Progress', 'Story', 'EPC-1000', 'AI-SECURITY-ENGINEER', 'scripts', now, now, now, '2026-06-05', None, None),
        
        ('TKT-1024', 'Update Button CSS', 'Update the primary button to use the new atomic design tokens.', 'Done', 'Task', 'STR-1001', 'AI-FRONTEND-WEB-ENG', 'frontend-web', now, now, now, '2026-05-25', None, None),
        ('TKT-1025', 'Refactor Orchestrator Containers', 'Update sandbox orchestrator to use persistent containers per role and feature vectors.', 'Done', 'Task', 'STR-1002', 'AI-CORE-PM', 'sandbox-orchestrator', now, now, now, '2026-05-29', None, None),
        ('TKT-1026', 'Create SQLite Ticket Manager', 'Migrate Clio DB UI to manage all atomic development tickets.', 'In Progress', 'Task', 'STR-1002', 'AI-ANALYST', 'scripts', now, now, now, '2026-05-30', None, None),
        ('TKT-1027', 'Test Sandbox Webhook Listener', 'Verify that new Jira/Linear webhook events trigger container provisioning.', 'ToDo', 'Task', 'STR-1002', 'AI-FUNCTIONAL-QA-ENG', 'sandbox-orchestrator', now, now, '2026-06-01', '2026-06-02', 'TKT-1025', None)
    ]

    cursor.executemany('''
    INSERT INTO tickets (ticket_id, subject, body_text, status, tier, parent_id, assigned_role, repository, created_at, updated_at, start_date, due_date, blocked_by, blocking)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', sample_data)

    conn.commit()
    conn.close()
    print(f"Successfully generated HIAD SQLite Ticket Database at {DB_PATH}")

if __name__ == '__main__':
    create_db()

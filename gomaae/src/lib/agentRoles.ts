import type { PhaseId } from './phaseConfig';
import { getPhaseForTier } from './phaseConfig';

export interface OrgNode {
  id: string;
  name: string;
  children?: OrgNode[];
  isActive?: boolean;
  // The single lifecycle a role operates in. On a department it acts as the
  // default for its roles; a role may override it. No role spans two lifecycles.
  lifecycle?: PhaseId;
}

export const ORG_DATA: OrgNode = {
  id: 'root',
  name: 'Executive Leadership (Agent Orchestrator)',
  isActive: true,
  children: [
    // Epic (initiative) and Story (planning) level roles were removed: those tiers
    // are human-owned. AI agents are assigned from Task tickets down, so the org
    // only defines roles for development, testing, and release lifecycles.
    {
      id: 'product-department',
      name: 'Product & Delivery',
      lifecycle: 'release',
      children: [
        { id: 'compliance-officer', name: 'Compliance Officer', isActive: false }
      ]
    },
    {
      id: 'engineering-department',
      name: 'Software Engineering',
      lifecycle: 'development',
      children: [
        { id: 'frontend-web-eng', name: 'Frontend Web Engineer', isActive: true },
        { id: 'unit-test-eng', name: 'Unit Test Engineer', isActive: true },
        { id: 'mobile-engineer', name: 'Mobile Engineer', isActive: true },
        { id: 'ui-ux-engineer', name: 'UI/UX Engineer', isActive: true },
        { id: 'api-engineer', name: 'API Engineer', isActive: true },
        { id: 'integration-engineer', name: 'Integration Engineer', isActive: true },
        { id: 'backend-engineer', name: 'Backend Engineer', isActive: false },
        { id: 'fullstack-engineer', name: 'Fullstack Engineer', isActive: false },
        { id: 'game-developer', name: 'Game Developer', isActive: false },
        { id: 'embedded-engineer', name: 'Embedded Systems Engineer', isActive: false }
      ]
    },
    {
      id: 'data-ml-department',
      name: 'Data & Machine Learning',
      lifecycle: 'development',
      children: [
        { id: 'data-engineer', name: 'Data Engineer', isActive: true },
        { id: 'database-admin', name: 'Database Administrator', isActive: true },
        { id: 'data-scientist', name: 'Data Scientist', isActive: true },
        { id: 'ml-engineer', name: 'Machine Learning Engineer', isActive: true },
        { id: 'dataops-engineer', name: 'DataOps Engineer', isActive: true },
        { id: 'mlops-engineer', name: 'MLOps Engineer', isActive: true },
        { id: 'analyst', name: 'Data Analyst', isActive: true },
        { id: 'ai-researcher', name: 'AI Researcher', isActive: false },
        { id: 'prompt-engineer', name: 'Prompt Engineer', isActive: false }
      ]
    },
    {
      id: 'qa-department',
      name: 'Quality Assurance',
      lifecycle: 'testing',
      children: [
        { id: 'functional-qa-eng', name: 'Functional QA Engineer', isActive: true },
        { id: 'performance-qa-eng', name: 'Performance QA Engineer', isActive: true },
        { id: 'accessibility-qa-eng', name: 'Accessibility QA Engineer', isActive: true },
        { id: 'security-qa', name: 'Security QA Tester', isActive: false },
        { id: 'automation-qa', name: 'Automation QA Engineer', isActive: false },
        { id: 'manual-qa', name: 'Manual QA Tester', isActive: false }
      ]
    },
    {
      id: 'operations-security-department',
      name: 'Operations & Security',
      lifecycle: 'release',
      children: [
        { id: 'devops-engineer', name: 'DevOps Engineer', isActive: true },
        { id: 'site-reliability-sre', name: 'Site Reliability Engineer (SRE)', isActive: true },
        { id: 'security-engineer', name: 'Security Engineer', isActive: true },
        { id: 'identity-engineer', name: 'Identity & Access Engineer', isActive: true },
        { id: 'finops-engineer', name: 'FinOps Engineer', isActive: true },
        { id: 'dependency-manager', name: 'Dependency Manager', isActive: true },
        { id: 'incident-commander', name: 'Incident Commander', isActive: false },
        { id: 'network-engineer', name: 'Network Engineer', isActive: false },
        { id: 'soc-analyst', name: 'SOC Analyst', isActive: false }
      ]
    },
    {
      id: 'support-department',
      name: 'Customer Support',
      lifecycle: 'release',
      children: [
        { id: 'tech-writer', name: 'Technical Writer', isActive: false },
        { id: 'support-engineer', name: 'Support Engineer', isActive: false },
        { id: 'customer-success', name: 'Customer Success Manager', isActive: false },
        { id: 'community-manager', name: 'Community Manager', isActive: false },
        { id: 'translation-specialist', name: 'Translation Specialist', isActive: false }
      ]
    }
  ]
};

export interface AgentRole {
  id: string;
  name: string;
  department: string;
  lifecycle: PhaseId;
  isActive: boolean;
}

/**
 * Validate an assigned role and return it only if it's a real role from the org.
 * Returns `null` for an empty/unknown role — `null` is a valid, intentional state
 * meaning "do not run this ticket with an AI agent".
 *
 * When a `tier` is given, the role must be defined for that ticket's level
 * (the tier's lifecycle); without a tier, any role in the org is accepted.
 */
export function sanitizeRole(roleName: string | null | undefined, tier?: string | null): string | null {
  if (!roleName) return null;
  const known = tier ? getAgentRoles({ lifecycle: getPhaseForTier(tier) }) : getAgentRoles();
  return known.some((r) => r.name === roleName) ? roleName : null;
}

/** Flatten the org tree into a role list, resolving each role's lifecycle. */
export function getAgentRoles(opts?: { activeOnly?: boolean; lifecycle?: string }): AgentRole[] {
  const roles: AgentRole[] = [];
  for (const dept of ORG_DATA.children ?? []) {
    for (const role of dept.children ?? []) {
      if (opts?.activeOnly && !role.isActive) continue;
      const lifecycle = (role.lifecycle ?? dept.lifecycle ?? 'planning') as PhaseId;
      if (opts?.lifecycle && lifecycle !== opts.lifecycle) continue;
      roles.push({ id: role.id, name: role.name, department: dept.name, lifecycle, isActive: !!role.isActive });
    }
  }
  return roles;
}

import type { PhaseId } from './phaseConfig';

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
    {
      id: 'product-department',
      name: 'Product & Delivery',
      lifecycle: 'initiative',
      children: [
        { id: 'core-pm', name: 'Core Product Manager', isActive: true },
        { id: 'ai-pm', name: 'AI Product Manager', isActive: true },
        { id: 'data-pm', name: 'Data Product Manager', isActive: true },
        { id: 'growth-pm', name: 'Growth Product Manager', isActive: true },
        { id: 'technical-pm', name: 'Technical Product Manager', isActive: true, lifecycle: 'planning' },
        { id: 'delivery-manager', name: 'Delivery Manager', isActive: true, lifecycle: 'planning' },
        { id: 'scrum-master', name: 'Scrum Master', isActive: false, lifecycle: 'planning' },
        { id: 'agile-coach', name: 'Agile Coach', isActive: false, lifecycle: 'planning' },
        { id: 'compliance-officer', name: 'Compliance Officer', isActive: false, lifecycle: 'release' }
      ]
    },
    {
      id: 'architecture-department',
      name: 'Architecture',
      lifecycle: 'planning',
      children: [
        { id: 'business-architect', name: 'Business Architect', isActive: true, lifecycle: 'initiative' },
        { id: 'technical-architect', name: 'Technical Architect', isActive: true },
        { id: 'cloud-architect', name: 'Cloud Architect', isActive: true },
        { id: 'data-architect', name: 'Data Architect', isActive: true },
        { id: 'security-architect', name: 'Security Architect', isActive: false },
        { id: 'enterprise-architect', name: 'Enterprise Architect', isActive: false }
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

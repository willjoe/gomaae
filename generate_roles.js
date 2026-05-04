const fs = require('fs');
const path = require('path');

const rolesData = [
  { category: "Architecture", name: "Business Architect", desc: "Aligns technology strategy with business goals, defines the highest-level epics, and ensures cross-departmental requirements are met." },
  { category: "Architecture", name: "Technical Architect", desc: "Designs application-level system components, establishes coding standards, and oversees software architecture and domain boundaries." },
  { category: "Architecture", name: "Data Architect", desc: "Designs the overarching enterprise data models, defines data governance, and establishes data warehousing strategy." },
  { category: "Architecture", name: "Cloud Architect", desc: "Designs the overarching infrastructure topology, networking strategy, security parameters, and cloud deployment models." },
  { category: "Product Management", name: "Core PM", desc: "Defines business requirements, scopes epics/stories, and provides final sign-off ensuring alignment with user needs." },
  { category: "Product Management", name: "Technical PM", desc: "Translates technical constraints into product requirements, managing complex architectural or backend epics." },
  { category: "Product Management", name: "AI PM", desc: "Manages AI/ML initiatives, defining model success metrics and integrating them into the core product." },
  { category: "Product Management", name: "Growth PM", desc: "Focuses on user acquisition, retention, and monetization funnels, running experiments and A/B tests." },
  { category: "Product Management", name: "Data PM", desc: "Treats data as a product, managing analytics pipelines, internal dashboards, and governance tools." },
  { category: "Product Management", name: "Dependency Manager", desc: "Orchestrates cross-domain tickets and workflows. Manages the 'Blocked' queue, tracks dependency metadata, and acts as the authoritative diplomat." },
  { category: "Core Engineering", name: "Identity Engineer", desc: "Centralizes the creation and management of all secrets, ephemeral credentials, API keys, and public-facing user identities." },
  { category: "Core Engineering", name: "API Engineer", desc: "Develops core server-side logic, internal/external APIs, and microservices in isolated environments." },
  { category: "Core Engineering", name: "Integration Engineer", desc: "Focuses on integrating third-party services, external APIs, and legacy systems with the core application logic." },
  { category: "Core Engineering", name: "UI/UX Engineer", desc: "Translates design prototypes into reusable, accessible frontend components and styling systems." },
  { category: "Core Engineering", name: "Frontend Web Eng.", desc: "Implements client-side business logic, state management, and API integrations for web applications." },
  { category: "Core Engineering", name: "Mobile Engineer", desc: "Develops native or cross-platform applications for iOS and Android environments." },
  { category: "Data & Machine Learning", name: "Data Engineer", desc: "Builds and maintains the data pipelines (ETL/ELT) responsible for moving and transforming large datasets." },
  { category: "Data & Machine Learning", name: "Data Scientist", desc: "Analyzes data to construct predictive models, algorithms, and complex statistical insights." },
  { category: "Data & Machine Learning", name: "Analyst", desc: "Focuses on business intelligence, creating dashboards, and running queries to extract actionable insights from data." },
  { category: "Data & Machine Learning", name: "ML Engineer", desc: "Bridges software engineering and data science to productize machine learning models, integrating them into backend systems." },
  { category: "Data & Machine Learning", name: "Database Admin", desc: "Specializes in database schema design, migrations, indexing, and query optimization." },
  { category: "Quality Assurance (QA) & Security", name: "Functional QA Eng.", desc: "Writes automated integration and end-to-end (E2E) tests against completed dev builds to ensure core business logic and workflows are functionally correct." },
  { category: "Quality Assurance (QA) & Security", name: "Performance QA Eng.", desc: "Develops load testing scripts, stress tests, and benchmarking suites to analyze system scalability and performance under peak traffic conditions." },
  { category: "Quality Assurance (QA) & Security", name: "Accessibility QA Eng.", desc: "Audits user interfaces and writes automated checks to ensure strict compliance with accessibility standards (WCAG) and inclusive usability guidelines." },
  { category: "Quality Assurance (QA) & Security", name: "Security Engineer", desc: "Audits architecture, writes security/penetration tests, and manages compliance guardrails across both the application and infrastructure layers." },
  { category: "Operations (Ops)", name: "Delivery Manager", desc: "Manages multiple concurrent production environments, toggling live traffic between active frontend subdomains, API versions, and ML models via the Delivery Dashboard." },
  { category: "Operations (Ops)", name: "DevOps Engineer", desc: "Focuses on developer velocity, managing CI/CD pipelines, build automation, and infrastructure for development/staging environments." },
  { category: "Operations (Ops)", name: "Site Reliability (SRE)", desc: "Focuses on production uptime, creating observability dashboards, configuring auto-scaling infrastructure, and conducting chaos engineering." },
  { category: "Operations (Ops)", name: "MLOps Engineer", desc: "Deploys and manages the lifecycle of machine learning models in production, handling GPU infrastructure and model serving pipelines." },
  { category: "Operations (Ops)", name: "DataOps Engineer", desc: "Ensures the reliability of production data flows by managing Airflow/ETL infrastructure and data quality monitoring systems." },
  { category: "Operations (Ops)", name: "FinOps Engineer", desc: "Implements cloud cost-control policies and creates financial dashboards to monitor and optimize infrastructure spending." }
];

const baseDir = path.join(__dirname, 'agent-roles', 'roles');

if (!fs.existsSync(baseDir)) {
  fs.mkdirSync(baseDir, { recursive: true });
}

rolesData.forEach(role => {
  const folderName = role.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const roleDir = path.join(baseDir, folderName);
  
  if (!fs.existsSync(roleDir)) {
    fs.mkdirSync(roleDir, { recursive: true });
  }

  // 1. Core Configuration (Vector JSON)
  const config = {
    version: "1.0.0",
    identity: {
      name: role.name,
      id: folderName,
      category: role.category,
      description: role.desc
    },
    sandbox_parameters: {
      network_egress: "restricted",
      allowed_domains: ["docs.python.org", "npmjs.com", "github.com"], // Base defaults to be overridden
      default_container: "api-key-container",
      max_execution_time_minutes: 60
    },
    access_scopes: {
      allowed_repositories: [], // Populated at runtime by orchestrator
      vcs_attribution: {
        GIT_AUTHOR_NAME: `AI-${folderName.toUpperCase()}`,
        GIT_COMMITTER_NAME: `AI-${folderName.toUpperCase()}`
      }
    }
  };
  fs.writeFileSync(path.join(roleDir, 'config.json'), JSON.stringify(config, null, 2));

  // 2. System Prompt / Instructions
  const systemPrompt = `# Role: ${role.name}\n\n## Category\n${role.category}\n\n## Objective\n${role.desc}\n\n## Directives\n1. You are operating in a High-Integrity environment.\n2. You must strictly adhere to your role's objective.\n3. You cannot modify code outside your specific ticket scope.\n4. Your commits will be automatically validated by the CI/CD Gauntlet.\n\n## Tools & Constraints\n* You are running in an ephemeral sandbox.\n* Your environment is configured via \`config.json\`.\n* You may invoke specialized tools as permitted by your \`tools.json\` and \`mcp.json\`.\n`;
  fs.writeFileSync(path.join(roleDir, 'system-prompt.md'), systemPrompt);

  // 3. MCP Connectors Config (Model Context Protocol)
  const mcpConfig = {
    version: "1.0",
    servers: {
      "ticket-system": {
        command: "node",
        args: ["/connectors/ticket-mcp-server.js"],
        env: {
          ROLE_ID: folderName
        }
      },
      "git-provider": {
        command: "node",
        args: ["/connectors/git-mcp-server.js"]
      }
    },
    capabilities: {
      read_tickets: true,
      update_ticket_status: true,
      create_pr: true
    }
  };
  fs.writeFileSync(path.join(roleDir, 'mcp.json'), JSON.stringify(mcpConfig, null, 2));

  // 4. Function Calling / Tools (Standard LLM functions)
  const toolsConfig = {
    tools: [
      {
        type: "function",
        function: {
          name: "request_dependency_unblock",
          description: "Signals the Dependency Manager that this task is blocked by another ticket.",
          parameters: {
            type: "object",
            properties: {
              blocked_by_ticket_id: { type: "string" },
              reason: { type: "string" }
            },
            required: ["blocked_by_ticket_id", "reason"]
          }
        }
      }
    ]
  };
  fs.writeFileSync(path.join(roleDir, 'tools.json'), JSON.stringify(toolsConfig, null, 2));
});

console.log(`Generated ${rolesData.length} role configurations in agent-roles/roles/`);

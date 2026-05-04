const fs = require('fs');
const path = require('path');

const connectorsDir = path.join(__dirname, 'connectors');

const directories = [
  path.join(connectorsDir, 'ticket-systems'),
  path.join(connectorsDir, 'git-providers')
];

directories.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// --- Ticket Systems ---

const baseTicketConnector = `
/**
 * Base Interface for Ticket Systems (Jira, Linear, etc.)
 * Enforces precise data entry and retrieval for the High-Integrity Atomic Development.
 */
class BaseTicketConnector {
  constructor(apiKey, baseUrl) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  /**
   * Retrieves the Atomic Task metadata required to provision a sandbox.
   * @param {string} ticketId 
   * @returns {Promise<{id: string, title: string, description: string, assignee: string, status: string, allowed_repositories: string[], mutation_scope: string[], qa_tests_required: string[]}>}
   */
  async getTaskMetadata(ticketId) { throw new Error("Not implemented"); }

  /**
   * Transitions the ticket to a new state (e.g., 'In Progress', 'Review/Done').
   * @param {string} ticketId 
   * @param {string} status 
   */
  async transitionStatus(ticketId, status) { throw new Error("Not implemented"); }

  /**
   * Uploads and attaches visual UI/UX evidence (video/images) directly to the ticket comment section.
   * @param {string} ticketId 
   * @param {string} artifactPath 
   */
  async attachEvidence(ticketId, artifactPath) { throw new Error("Not implemented"); }
}

module.exports = BaseTicketConnector;
`;

const jiraConnector = `
const BaseTicketConnector = require('./base-ticket-connector');

class JiraConnector extends BaseTicketConnector {
  constructor(apiKey, baseUrl, email) {
    super(apiKey, baseUrl);
    this.email = email;
  }

  async getTaskMetadata(ticketId) {
    console.log(\`[Jira] Fetching metadata for \${ticketId}...\`);
    // Implementation: HTTP GET to /rest/api/3/issue/{ticketId}
    // Parse custom fields for 'allowed_repositories' and 'mutation_scope'
    return {
      id: ticketId,
      title: "Implement Checkout Button",
      description: "Add a checkout button to the cart page.",
      assignee: "human.engineer@company.com",
      status: "In Progress",
      allowed_repositories: ["frontend-web"],
      mutation_scope: ["src/components/Checkout/*"],
      qa_tests_required: ["E2E_Checkout_Flow"]
    };
  }

  async transitionStatus(ticketId, status) {
    console.log(\`[Jira] Transitioning \${ticketId} to \${status}...\`);
    // Implementation: HTTP POST to /rest/api/3/issue/{ticketId}/transitions
  }

  async attachEvidence(ticketId, artifactPath) {
    console.log(\`[Jira] Attaching evidence \${artifactPath} to \${ticketId}...\`);
    // Implementation: HTTP POST to /rest/api/3/issue/{ticketId}/attachments
  }
}

module.exports = JiraConnector;
`;

const linearConnector = `
const BaseTicketConnector = require('./base-ticket-connector');

class LinearConnector extends BaseTicketConnector {
  constructor(apiKey) {
    super(apiKey, 'https://api.linear.app/graphql');
  }

  async getTaskMetadata(ticketId) {
    console.log(\`[Linear] Fetching metadata for \${ticketId}...\`);
    // Implementation: GraphQL query to Linear API
    return {
      id: ticketId,
      title: "Implement Checkout Button",
      description: "Add a checkout button to the cart page.",
      assignee: "human.engineer@company.com",
      status: "In Progress",
      allowed_repositories: ["frontend-web"],
      mutation_scope: ["src/components/Checkout/*"],
      qa_tests_required: ["E2E_Checkout_Flow"]
    };
  }

  async transitionStatus(ticketId, status) {
    console.log(\`[Linear] Transitioning \${ticketId} to \${status}...\`);
    // Implementation: GraphQL mutation issueUpdate
  }

  async attachEvidence(ticketId, artifactPath) {
    console.log(\`[Linear] Attaching evidence \${artifactPath} to \${ticketId}...\`);
    // Implementation: Upload to storage, then GraphQL mutation commentCreate with link
  }
}

module.exports = LinearConnector;
`;

fs.writeFileSync(path.join(directories[0], 'base-ticket-connector.js'), baseTicketConnector);
fs.writeFileSync(path.join(directories[0], 'jira-connector.js'), jiraConnector);
fs.writeFileSync(path.join(directories[0], 'linear-connector.js'), linearConnector);

// --- Git Providers ---

const baseGitConnector = `
/**
 * Base Interface for Git Providers (GitHub, GitLab, etc.)
 * Enforces strict PR creation, review assignments, and JIT credentialing.
 */
class BaseGitConnector {
  constructor(apiToken, baseUrl) {
    this.apiToken = apiToken;
    this.baseUrl = baseUrl;
  }

  /**
   * Generates a short-lived JIT token scoped ONLY to the requested repository.
   * @param {string} repositoryName 
   * @returns {Promise<string>} Ephemeral Git Token
   */
  async generateJitToken(repositoryName) { throw new Error("Not implemented"); }

  /**
   * Opens a Pull Request and strictly assigns the human ticket assignee as the mandatory reviewer.
   * @param {string} repositoryName 
   * @param {string} branchName 
   * @param {string} title 
   * @param {string} body 
   * @param {string} humanReviewerId 
   */
  async createPullRequest(repositoryName, branchName, title, body, humanReviewerId) { throw new Error("Not implemented"); }
}

module.exports = BaseGitConnector;
`;

const githubConnector = `
const BaseGitConnector = require('./base-git-connector');

class GitHubConnector extends BaseGitConnector {
  constructor(apiToken) {
    super(apiToken, 'https://api.github.com');
  }

  async generateJitToken(repositoryName) {
    console.log(\`[GitHub] Generating JIT Installation Token for \${repositoryName}...\`);
    // Implementation: POST /app/installations/{installation_id}/access_tokens
    // Restrict permissions to 'contents: write' for the specific repo
    return "ghs_ephemeral_token_12345";
  }

  async createPullRequest(repositoryName, branchName, title, body, humanReviewerId) {
    console.log(\`[GitHub] Creating PR for \${branchName} in \${repositoryName}...\`);
    // Implementation: POST /repos/{owner}/{repo}/pulls
    
    console.log(\`[GitHub] Assigning mandatory reviewer: \${humanReviewerId}...\`);
    // Implementation: POST /repos/{owner}/{repo}/pulls/{pull_number}/requested_reviewers
    return { prUrl: \`https://github.com/org/\${repositoryName}/pull/1\` };
  }
}

module.exports = GitHubConnector;
`;

const gitlabConnector = `
const BaseGitConnector = require('./base-git-connector');

class GitLabConnector extends BaseGitConnector {
  constructor(apiToken, baseUrl = 'https://gitlab.com/api/v4') {
    super(apiToken, baseUrl);
  }

  async generateJitToken(repositoryName) {
    console.log(\`[GitLab] Generating Project Access Token for \${repositoryName}...\`);
    // Implementation: POST /projects/{id}/access_tokens
    // Restrict scopes to 'write_repository'
    return "glpat_ephemeral_token_12345";
  }

  async createPullRequest(repositoryName, branchName, title, body, humanReviewerId) {
    console.log(\`[GitLab] Creating Merge Request for \${branchName} in \${repositoryName}...\`);
    // Implementation: POST /projects/{id}/merge_requests
    
    console.log(\`[GitLab] Assigning mandatory reviewer: \${humanReviewerId}...\`);
    // Implementation: PUT /projects/{id}/merge_requests/{merge_request_iid} (update assignee_ids)
    return { prUrl: \`https://gitlab.com/org/\${repositoryName}/-/merge_requests/1\` };
  }
}

module.exports = GitLabConnector;
`;

fs.writeFileSync(path.join(directories[1], 'base-git-connector.js'), baseGitConnector);
fs.writeFileSync(path.join(directories[1], 'github-connector.js'), githubConnector);
fs.writeFileSync(path.join(directories[1], 'gitlab-connector.js'), gitlabConnector);

console.log("Connectors generated successfully in connectors/");

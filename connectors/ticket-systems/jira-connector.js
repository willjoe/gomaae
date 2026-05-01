
const BaseTicketConnector = require('./base-ticket-connector');

class JiraConnector extends BaseTicketConnector {
  constructor(apiKey, baseUrl, email) {
    super(apiKey, baseUrl);
    this.email = email;
  }

  async getTaskMetadata(ticketId) {
    console.log(`[Jira] Fetching metadata for ${ticketId}...`);
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
    console.log(`[Jira] Transitioning ${ticketId} to ${status}...`);
    // Implementation: HTTP POST to /rest/api/3/issue/{ticketId}/transitions
  }

  async attachEvidence(ticketId, artifactPath) {
    console.log(`[Jira] Attaching evidence ${artifactPath} to ${ticketId}...`);
    // Implementation: HTTP POST to /rest/api/3/issue/{ticketId}/attachments
  }
}

module.exports = JiraConnector;

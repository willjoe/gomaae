
const BaseTicketConnector = require('./base-ticket-connector');

class LinearConnector extends BaseTicketConnector {
  constructor(apiKey) {
    super(apiKey, 'https://api.linear.app/graphql');
  }

  async getTaskMetadata(ticketId) {
    console.log(`[Linear] Fetching metadata for ${ticketId}...`);
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
    console.log(`[Linear] Transitioning ${ticketId} to ${status}...`);
    // Implementation: GraphQL mutation issueUpdate
  }

  async attachEvidence(ticketId, artifactPath) {
    console.log(`[Linear] Attaching evidence ${artifactPath} to ${ticketId}...`);
    // Implementation: Upload to storage, then GraphQL mutation commentCreate with link
  }
}

module.exports = LinearConnector;

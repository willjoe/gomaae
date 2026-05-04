const BaseTicketConnector = require('./base-ticket-connector');

class JiraConnector extends BaseTicketConnector {
  constructor(apiKey, baseUrl, email) {
    super(apiKey, baseUrl);
    this.email = email;
  }

  async getTaskMetadata(ticketId) {
    console.log(\`[Jira] Fetching metadata for \${ticketId}...\`);
    
    // Implementation: HTTP GET to /rest/api/3/issue/{ticketId}
    // Jira stores labels in issue.fields.labels and description in issue.fields.description
    
    // Simulated raw response:
    const rawDescription = "Add a checkout button to the cart page.\\n\\n**Mutation Scope:** `src/components/Checkout/*`\\n**Estimated Token Usage:** 8000\\n**Tokens Used:** 0\\n**Designated Reviewer:** @frontend-lead";
    const rawLabels = ["Role: Frontend Web Eng."]; // Transformed from Jira's custom label field

    // Use the exact same parser as Linear to guarantee identical AI behavior
    const hiadMetadata = this.parseHighIntegrityMetadata(rawDescription, rawLabels);

    return {
      id: ticketId,
      title: "Implement Checkout Button",
      description: rawDescription,
      status: "In Progress",
      metadata: hiadMetadata
    };
  }

  async transitionStatus(ticketId, status) {
    console.log(\`[Jira] Transitioning \${ticketId} to \${status}...\`);
    // Implementation: HTTP POST to /rest/api/3/issue/{ticketId}/transitions
  }

  async updateTicketMetadata(ticketId, updates) {
    console.log(\`[Jira] Updating metadata for \${ticketId}: \`, updates);
    
    // For Jira, we perform the exact same regex rewrite on the description field.
    if (updates.tokens_used !== undefined) {
      console.log(\`[Jira] Rewriting ticket description to reflect **Tokens Used:** \${updates.tokens_used}\`);
      // Implementation:
      // 1. Fetch current description via GET.
      // 2. newDesc = description.replace(/\*\*Tokens Used:\*\*\s*\d+/, `**Tokens Used:** ${updates.tokens_used}`);
      // 3. HTTP PUT to /rest/api/3/issue/{ticketId} with { fields: { description: newDesc } }
    }
  }

  async attachEvidence(ticketId, artifactPath) {
    console.log(\`[Jira] Attaching evidence \${artifactPath} to \${ticketId}...\`);
    // Implementation: HTTP POST to /rest/api/3/issue/{ticketId}/attachments
  }
}

module.exports = JiraConnector;

const BaseTicketConnector = require('./base-ticket-connector');

class LinearConnector extends BaseTicketConnector {
  constructor(apiKey) {
    super(apiKey, 'https://api.linear.app/graphql');
  }

  async getTaskMetadata(ticketId) {
    console.log(\`[Linear] Fetching metadata for \${ticketId}...\`);
    
    // Implementation: GraphQL query to Linear API fetching title, description, state, and labels
    // Simulated raw response from API:
    const rawDescription = "Implement the token budget constraints.\\n\\n**Mutation Scope:** `sandbox-orchestrator/src/orchestrator.js`\\n**Estimated Token Usage:** 15000\\n**Tokens Used:** 0\\n**Designated Reviewer:** @core-pm";
    const rawLabels = ["Role: API Engineer", "Priority: High"];
    
    // Use the universal base class parser to enforce consistency
    const hiadMetadata = this.parseHighIntegrityMetadata(rawDescription, rawLabels);

    return {
      id: ticketId,
      title: "Implement Budget-Aware Token Interceptor",
      description: rawDescription,
      status: "In Progress",
      metadata: hiadMetadata
    };
  }

  async transitionStatus(ticketId, status) {
    console.log(\`[Linear] Transitioning \${ticketId} to \${status}...\`);
    // Implementation: GraphQL mutation issueUpdate { stateId: "..." }
  }

  async updateTicketMetadata(ticketId, updates) {
    console.log(\`[Linear] Updating metadata for \${ticketId}: \`, updates);
    
    // If updating 'tokens_used', we must fetch the current description, 
    // run a regex replace on the specific line, and push the new description via issueUpdate.
    if (updates.tokens_used !== undefined) {
      console.log(\`[Linear] Rewriting ticket description to reflect **Tokens Used:** \${updates.tokens_used}\`);
      // Implementation:
      // 1. Fetch current description.
      // 2. newDesc = description.replace(/\*\*Tokens Used:\*\*\s*\d+/, `**Tokens Used:** ${updates.tokens_used}`);
      // 3. GraphQL mutation issueUpdate(id: $ticketId, input: { description: $newDesc })
    }
  }

  async attachEvidence(ticketId, artifactPath) {
    console.log(\`[Linear] Attaching evidence \${artifactPath} to \${ticketId}...\`);
    // Implementation: Upload to storage, then GraphQL mutation commentCreate with the video link
  }
}

module.exports = LinearConnector;

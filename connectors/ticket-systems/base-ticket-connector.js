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
   * Universal parser for High-Integrity metadata.
   * Extracts the strict security parameters from the ticket description body and labels.
   * This ensures the parsing logic is identical whether the ticket comes from Jira, Linear, or anywhere else.
   * 
   * @param {string} description The markdown body of the ticket.
   * @param {string[]} labels An array of label strings attached to the ticket.
   * @returns {Object} Extracted High-Integrity metadata
   */
  parseHighIntegrityMetadata(description, labels = []) {
    const metadata = {
      assigned_role: null,
      mutation_scope: [],
      estimated_token_usage: 0,
      tokens_used: 0,
      designated_reviewer: null,
      qa_tests_required: []
    };

    // 1. Extract Role from Labels (e.g., "Role: API Engineer")
    const roleLabel = labels.find(l => l.startsWith('Role: '));
    if (roleLabel) {
      metadata.assigned_role = roleLabel.replace('Role: ', '').trim();
    }

    if (!description) return metadata;

    // 2. Extract Mutation Scope
    const scopeMatch = description.match(/\*\*Mutation Scope:\*\*\s*`([^`]+)`/);
    if (scopeMatch && scopeMatch[1]) {
      metadata.mutation_scope = scopeMatch[1].split(',').map(s => s.trim());
    }

    // 3. Extract Estimated Token Usage
    const estimatedMatch = description.match(/\*\*Estimated Token Usage:\*\*\s*(\d+)/);
    if (estimatedMatch && estimatedMatch[1]) {
      metadata.estimated_token_usage = parseInt(estimatedMatch[1], 10);
    }

    // 4. Extract Tokens Used
    const usedMatch = description.match(/\*\*Tokens Used:\*\*\s*(\d+)/);
    if (usedMatch && usedMatch[1]) {
      metadata.tokens_used = parseInt(usedMatch[1], 10);
    }

    // 5. Extract Designated Reviewer
    const reviewerMatch = description.match(/\*\*Designated Reviewer:\*\*\s*(@[\w-]+)/);
    if (reviewerMatch && reviewerMatch[1]) {
      metadata.designated_reviewer = reviewerMatch[1];
    }

    // 6. Extract QA Tests Required
    const qaMatch = description.match(/\*\*Required QA:\*\*\s*(.*)/);
    if (qaMatch && qaMatch[1]) {
      metadata.qa_tests_required.push(qaMatch[1].trim());
    }

    return metadata;
  }

  /**
   * Retrieves the Atomic Task metadata required to provision a sandbox.
   * Implementations should fetch the raw data and then pass it through parseHighIntegrityMetadata().
   * 
   * @param {string} ticketId 
   * @returns {Promise<{id: string, title: string, description: string, status: string, metadata: Object}>}
   */
  async getTaskMetadata(ticketId) { throw new Error("Not implemented"); }

  /**
   * Transitions the ticket to a new state (e.g., 'In Progress', 'In Review', 'Done').
   * @param {string} ticketId 
   * @param {string} status 
   */
  async transitionStatus(ticketId, status) { throw new Error("Not implemented"); }

  /**
   * Updates specific metadata fields on the ticket. 
   * For instance, rewriting the '**Tokens Used:** 0' string in the description body to reflect actual usage.
   * @param {string} ticketId 
   * @param {Object} updates Key-value pairs of fields to update (e.g., { tokens_used: 15420 })
   */
  async updateTicketMetadata(ticketId, updates) { throw new Error("Not implemented"); }

  /**
   * Uploads and attaches visual UI/UX evidence (video/images) directly to the ticket comment section.
   * @param {string} ticketId 
   * @param {string} artifactPath 
   */
  async attachEvidence(ticketId, artifactPath) { throw new Error("Not implemented"); }
}

module.exports = BaseTicketConnector;

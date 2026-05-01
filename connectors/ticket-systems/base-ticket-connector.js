
/**
 * Base Interface for Ticket Systems (Jira, Linear, etc.)
 * Enforces precise data entry and retrieval for the Zero-Trust Chain of Command.
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


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

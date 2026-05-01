# Zero-Trust Version Control & Testing Requirements

In the Zero-Trust Chain of Command architecture, the version control system (VCS) is the final cryptographic gateway before code can be considered for integration. Trust is never placed in the engineer (human or AI) to verify their own work. Instead, the VCS acts as an active enforcement engine, strictly gating commits and merges based on cryptographic signatures, ticket metadata, and exhaustive automated testing.

---

## 1. The Immutable Commit Gateway

Code cannot be pushed to the central repository simply because an engineer has network access. The VCS enforces a strict "Test-Driven Pre-Commit" policy.

### Pre-Commit Validation
Before a `git commit` or `git push` is accepted by the server, the following automated validations must pass:

1.  **Cryptographic Signature:** Every commit must be signed using the ephemeral JIT credentials provisioned specifically for the active Atomic Task.
2.  **Scope Verification:** The modified files in the commit must perfectly match the `allow_write` mutation scope defined in the ticket. If an engineer modifies an unauthorized file, the commit is rejected outright.
3.  **Universal Strict Linting:** Exhaustive linting is implemented and enforced for *every* programming language in the repository (e.g., ESLint for TS/JS, Ruff/Flake8 for Python, GolangCI-Lint for Go, and SQLFluff for database queries). The pre-commit hook acts as an absolute gatekeeper; any code that deviates from the strict organizational style guide or triggers a linting warning is immediately rejected.
4.  **Local Pre-Commit Testing:** The code must successfully compile/build, and all localized unit tests and syntax checks must pass within the isolated sandbox environment. 
5.  **Semantic Commit Granularity (Per Script):** Commits must be highly granular and atomic. Specifically, code must be committed *per script* or per logical boundary. Every single commit message must be able to explain the exact change made to that specific script in a single, concise sentence. "Kitchen sink" commits across multiple scripts (e.g., "Updated frontend components and fixed API bug") are strictly blocked by pre-commit hooks to ensure precise traceability, isolated code review, and surgical rollback capability. 

---

## 2. Exhaustive Branch Coverage (The "Test for the Test")

In a Zero-Trust environment, it is not enough to simply have tests; the system must mathematically prove that the tests are sufficient. This is achieved through strict **Process Branch Auditing**.

### Cyclomatic Complexity & Branch Counting
Every piece of logic introduces "process branches" (e.g., `if/else` statements, `switch` cases, `try/catch` blocks). 
*   During the pre-commit phase, a static analysis tool analyzes the submitted code and counts the exact number of logical process branches.
*   The system then enforces a **1:1 minimum correlation** between process branches and unit test assertions.

### Enforcing Coverage
1.  **Absolute Minimum Coverage:** The CI/CD pipeline enforces 100% logical branch coverage. If an engineer writes a new `if/else` block, they must provide at least two unit tests covering both the `true` and `false` execution paths.
2.  **Mutation Testing (Testing the Tests):** To ensure engineers (or AI Agents) aren't writing "dummy tests" just to pass the coverage check (e.g., `expect(true).toBe(true)`), the pipeline employs Mutation Testing.
    *   The system automatically injects small defects (mutations) into the submitted code (e.g., changing a `>` to a `<`).
    *   If the provided unit tests *do not* fail when the code is mutated, the tests are deemed invalid, and the commit is rejected.
3.  **The Rejection Loop:** If the static analysis tool detects 5 process branches in the code, but only 3 valid unit test paths are executed, the commit fails with an error: *"Insufficient branch coverage: 5 branches detected, 3 tests executed. Missing coverage for line X."*

---

## 3. GitOps CI/CD & Branch Protection Rules

The version control workflow relies entirely on automated pipelines fully stored in the Git repository as code, with strict branch protection rules acting as the "Human Gate". All deployments are purely driven by Git triggers (e.g., a merge to the `main` branch).

### 3.1 Branch Protection Rules (The Human Gate)
To prevent unauthorized code from reaching the main branch, strict protection rules enforce the review process. *Note: All tickets are assumed to be actively worked on by AI Agents at all times unless the ticket status is explicitly set to "Paused".*

*   **Mandatory Human Reviews:** Every ticket must be assigned to a human. This **ticket assignee** *must* at least review and approve the associated Pull Request before it can be merged. AIs cannot bypass this final human approval.
*   **AI Pre-Review Check:** Before the human review, AI agents operating in the QA roles defined earlier will conduct a pre-review of the PR. The specific required QA tests and validation steps for this review are explicitly defined in the ticket metadata.
*   **Dynamic Code Owners & Hierarchical Approvals:** Code ownership and mandatory review gates align strictly with the ticket hierarchy to manage environmental risk:
    *   **Task Tickets:** Define who is responsible for the creation, update, and fix of specific scripts or modules. The human assignee on the task ticket must review and approve the initial Pull Request for these localized code blocks.
    *   **Story Tickets:** Define who is responsible for feature creation, updates, and fixes. The human assignee of the Story ticket must be involved in reviewing and approving any merges destined for **Staging** and **Production** environments.
    *   **Epic Tickets:** Define who is responsible for overall business initiatives. The human assignee of the Epic ticket must review and approve any merges destined for the live **Production** environment.

### 3.2 Pre-Merge CI Pipeline (Automated Gauntlet)
Before a PR can be merged (and before human review is completed), it must pass an automated CI pipeline:
*   Re-runs all local unit tests in a clean, ephemeral runner.
*   Executes the QA E2E and integration tests required by the ticket.
*   Runs static application security testing (SAST) and dependency vulnerability scans.

### 3.3 Visual UI/UX Evidence (Dedicated Validation Container)
Because visual UI/UX validation cannot rely on manual remote-desktop verification, the architecture enforces undeniable video evidence universally generated for human reviewers. This process is strictly isolated from the AI development sandbox:
*   **Triggered by PR:** When a Pull Request is opened, the CI/CD pipeline spins up a *separate, dedicated* ephemeral container specifically for visual and E2E testing, ensuring the validation environment is completely clean.
*   **Component-Level Evidence (Storybook):** The CI pipeline automatically runs a Storybook test runner. As it iterates through every mandated story, it captures a short video of the isolated component rendering and executing its defined interactions.
*   **Full Flow Evidence (E2E Tests):** End-to-End (E2E) testing frameworks (e.g., Playwright, Cypress) natively record video (`.webm` or `.mp4`) of the browser viewport during test execution. 
    *   *The E2E Rule:* The E2E tests must perfectly follow the story as written in the Story Ticket. 
    *   *Video Segmentation:* If the Story Ticket has multiple sections or distinct user journeys, the E2E tests must be segmented so that the recorded video files are split to reflect those distinct sections directly.
*   **Ticket-Hosted Video Attachment:** Before this validation container is destroyed, the orchestrator extracts all video files (Storybook components and E2E flows). These videos are automatically uploaded and hosted directly within the **Ticket's Comment Section** (e.g., in Jira or Linear). 
*   **PR Link:** A comment is posted to the Pull Request containing direct links to the video evidence hosted on the ticket. The human ticket assignee does not just read the AI's code; they must physically watch the component and flow videos before clicking "Approve".

### 3.4 Post-Merge CD Pipeline (Git-Triggered Deployment)
Deployments are never run manually. They are exclusively triggered by Git events.
*   Once a PR passes all Pre-Merge CI checks and is approved by the required **ticket assignee(s)**, it is merged into the main trunk.
*   This merge operation automatically triggers the post-merge CD pipeline to deploy the newly integrated code to the appropriate environment, ensuring the repository always perfectly reflects the live production state.

By strictly linking the version control system to the ticket metadata and demanding mathematical proof of test coverage (via branch counting and mutation testing), the Zero-Trust architecture ensures that broken, untested, or unauthorized code mathematically cannot enter the production pipeline.
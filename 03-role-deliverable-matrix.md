# Engineer Roles vs. Deliverables Matrix

In a Zero-Trust Chain of Command, roles are strictly defined. An engineer with a specific role is systematically prevented from generating deliverables outside their purview. This isolation extends not just to codebase artifacts, but to the project management layer as well.

The ticket system is divided into three layers: **Epic**, **Story**, and **Task**. Each layer has distinct lifecycle statuses. Access to create, transition, or close these items is strictly role-based.

### Workflow Sequence

The matrix below uses numbers (1-14) to illustrate how tasks and deliverables are handed off sequentially across specialized roles. Continuous management deliverables (reports) are denoted by letters. By separating Identity Management, specialized QA, and the various Operations (Ops) specializations from core development, the pipeline ensures code is written, validated, and then deployed in distinct, zero-trust phases:

1.  **Ideation & Strategy:** Drafting initial requirement documents and the Epic.
2.  **Epic Approval:** Moving the Epic to an active state.
3.  **Requirements Gathering:** Drafting the Stories within the Epic.
4.  **Story Approval:** Approving the Story for development.
5.  **Task Scoping:** Breaking the Story down into specific Atomic Tasks and assigning them.
6.  **Identity & Credential Provisioning:** The Identity Engineer provisions necessary ephemeral internal logins, database credentials, API keys, Vault secrets, as well as any public-facing user logins or customer identities required for development and testing.
7.  **Parallel Execution (Development):** API, Integration, UI/UX, Web, Mobile, Data, ML, and Database engineers move development tasks to "In Progress" and generate core code/data within isolated sandboxes. Analysts and Data Scientists can also generate BI and Models here. They also write their respective Unit/Integration Tests.
8.  **Submission (Development):** Developers complete execution and submit code for automated validation, moving tasks to "Review/Done".
9.  **Execution (QA & Security Validation):** Following development submission, specialized QA and Security engineers pick up testing tasks ("In Progress"). They independently generate E2E tests, load testing scripts, accessibility checks, security probes, and QA Mock Data against the completed dev build to ensure different points of view review the product.
10. **Submission (QA):** QA and Security complete test suites and move tasks to "Review/Done".
11. **Execution (Operations & Deployment):** Once validated by all QA disciplines, the specialized Ops teams (DevOps, SRE, MLOps, DataOps, FinOps) pick up deployment and infrastructure tasks ("In Progress"). They update Pipeline Code, Infrastructure Code, deploy models, write infrastructure tests (Chaos/Resiliency), and build observability/cost dashboards to release and monitor the changes safely.
12. **Submission (Operations):** Ops tasks are moved to "Review/Done".
13. **Final Approval:** Product Management and Security review the completed story and close out the tickets.
14. **Retrospective:** Following ticket closure, team members generate a retrospective document analyzing pipeline efficiency, security posture, and bottlenecks for continuous improvement.

*(Note: Continuous reporting deliverables occur outside the strict 1-14 sequence and are marked as **D** for Daily, **W** for Weekly, and **M** for Monthly).*

### Deliverables Access Matrix

| Role \ Deliverable | Documents | Epic<br>(Draft) | Epic<br>(Active/Closed) | Story<br>(Draft) | Story<br>(Active/Closed) | Task<br>(Draft/Assign) | Task<br>(In Progress) | Task<br>(Review/Done) | Logins &<br>Credentials | Backend<br>Code | ML Code &<br>Models | Pipeline<br>Code | Infra<br>Code | Data<br>(Mock) | DB Code<br>(DDL/DML) | Frontend<br>Code | Analytics<br>& BI | Unit/Int<br>Tests | E2E/Func<br>Tests | Perf/Load<br>Tests | Access.<br>Tests | Security<br>Tests | Chaos<br>Tests | Delivery<br>Dashboard | Daily<br>Report | Weekly<br>Report | Monthly<br>Report | Retro-<br>spective |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Business Architect** | 1 | 1 | 2 | 3 | 4 | 5 | | | | | | | | | | | | | | | | | | V | D | W | M | 14 |
| **Technical Architect**| 1 | 1 | 2 | 3 | 4 | 5 | | | | | | | | | | | | | | | | | | V | D | W | M | 14 |
| **Data Architect** | 1 | 1 | 2 | 3 | 4 | 5 | | | | | | | | | | | | | | | | | | V | D | W | M | 14 |
| **Cloud Architect** | 1 | 1 | 2 | 3 | 4 | 5 | | | | | | | | | | | | | | | | | | V | D | W | M | 14 |
| **Core PM** | 1 | 1 | 2 | 3 | 4 | 5 | | 13 | | | | | | | | | | | | | | | | V | D | W | M | 14 |
| **Technical PM** | 1 | 1 | 2 | 3 | 4 | 5 | | 13 | | | | | | | | | | | | | | | | V | D | W | M | 14 |
| **AI PM** | 1 | 1 | 2 | 3 | 4 | 5 | | 13 | | | | | | | | | | | | | | | | V | D | W | M | 14 |
| **Growth PM** | 1 | 1 | 2 | 3 | 4 | 5 | | 13 | | | | | | | | | | | | | | | | V | D | W | M | 14 |
| **Data PM** | 1 | 1 | 2 | 3 | 4 | 5 | | 13 | | | | | | | | | | | | | | | | V | D | W | M | 14 |
| **Dependency Manager**| | | | | | 5 | | 13 | | | | | | | | | | | | | | | | V | D | W | M | 14 |
| **Identity Engineer**| | | | | | | 6 | 7 | 6 | | | | | | | | | | | | | | | | D | | | 14 |
| **API Engineer** | | | | | | | 7 | 8 | | 7 | | | | 7 | | | | 7 | | | | | | | D | | | 14 |
| **Integration Engineer**| | | | | | | 7 | 8 | | 7 | | | | 7 | | | | 7 | | | | | | | D | | | 14 |
| **UI/UX Engineer** | | | | | | | 7 | 8 | | | | | | 7 | | 7 | | 7 | | | | | | | D | | | 14 |
| **Frontend Web Eng.**| | | | | | | 7 | 8 | | | | | | 7 | | 7 | | 7 | | | | | | | D | | | 14 |
| **Mobile Engineer** | | | | | | | 7 | 8 | | | | | | 7 | | 7 | | 7 | | | | | | | D | | | 14 |
| **Data Engineer** | | | | | | | 7 | 8 | | | | 7 | | 7 | 7 | | | 7 | | | | | | | D | | | 14 |
| **Data Scientist** | 1 | | | 3 | | | 7 | 8 | | | 7 | | | 7 | | | 7 | 7 | | | | | | | D | | | 14 |
| **Analyst** | 1 | | | 3 | | | 7 | 8 | | | | | | | | | 7 | | | | | | | | D | W | M | 14 |
| **ML Engineer** | | | | | | | 7 | 8 | | 7 | 7 | 7 | | 7 | | | | 7 | | | | | | | D | | | 14 |
| **Database Admin** | | | | | | | 7 | 8 | | | | | | | 7 | | | | | | | | | | D | | | 14 |
| **Functional QA Eng.** | | | | | | | 9 | 10 | | | | | | 9 | | | | | 9 | | | | | V | D | | | 14 |
| **Performance QA Eng.**| | | | | | | 9 | 10 | | | | | | 9 | | | | | | 9 | | | | V | D | | | 14 |
| **Accessibility QA Eng.**| | | | | | | 9 | 10 | | | | | | 9 | | | | | | | 9 | | | V | D | | | 14 |
| **Delivery Manager** | | | | | | | 11 | 12 | | | | | | | | | | | | | | | | 11 | D | W | M | 14 |
| **DevOps Engineer** | | | | | | | 11 | 12 | | | | 11 | 11 | | | | | 11 | | | | | | V | D | W | | 14 |
| **Site Reliability (SRE)**| | | | | | | 11 | 12 | | | | 11 | 11 | | | | 11 | | | | | | 11 | V | D | W | M | 14 |
| **MLOps Engineer** | | | | | | | 11 | 12 | | | 11 | 11 | 11 | | | | | 11 | | | | | | V | D | W | | 14 |
| **DataOps Engineer** | | | | | | | 11 | 12 | | | | 11 | 11 | 11 | | | 11 | 11 | | | | | | V | D | W | | 14 |
| **FinOps Engineer** | | | | | | | 11 | 12 | | | | | 11 | | | | 11 | 11 | | | | | | V | D | W | M | 14 |
| **Security Engineer**| 1 | 1 | | 3 | | 5 | 9, 11 | 10, 12 | 6 | | | 11 | 11 | | | | | | | | | 9, 11 | | V | D | W | M | 14 |

### Deliverable Definitions:
*   **Documents:** Architecture Decision Records (ADRs), requirement specs, API contracts.
*   **Epic / Story / Task:** See definitions and statuses above. Standard engineers *cannot* create Tasks; they only transition them to "In Progress" and submit code for "Review/Done".
*   **Logins & Credentials:** Creating, rotating, and managing access tokens, database credentials, API keys, service accounts, Vault configurations, AND public-facing customer/user identities.
*   **Backend Code:** Application logic, APIs, microservices, and third-party integrations.
*   **ML Code & Models:** Machine learning models, training scripts, weights, inference algorithms, and feature engineering logic.
*   **Pipeline Code:** CI/CD scripts, data pipelines (ETL/Airflow), deployment automation workflows (e.g., GitHub Actions, Jenkins).
*   **Infrastructure Code:** Infrastructure as Code (IaC) such as Terraform, Kubernetes manifests, Pulumi, CloudFormation, server provisioning scripts, and cost-control policies.
*   **Data:** Generating mock data for testing or migrating test datasets. (Production data access is strictly prohibited for all engineering roles).
*   **DB Code (DDL/DML):** Schema definitions, migrations, stored procedures.
*   **Frontend Code:** UI components, client-side logic, web/mobile apps.
*   **Analytics & BI:** Data visualizations, observability dashboards, cost-analysis reports, business intelligence queries, and statistical reports.
*   **Unit/Int Tests:** Unit and integration tests written alongside core code (Backend, Frontend, Data, Infrastructure, ML).
*   **E2E/Func Tests:** End-to-end and functional automated tests validating complete user workflows.
*   **Perf/Load Tests:** Load testing scripts, stress tests, and benchmarking code.
*   **Access. Tests:** Automated checks for WCAG compliance and usability guidelines.
*   **Security Tests:** Automated vulnerability scanners, penetration testing scripts, and compliance checks.
*   **Chaos Tests:** Chaos engineering scripts and resilience probes deployed against infrastructure.
*   **Delivery Dashboard:** The centralized control plane for routing live traffic across multiple concurrent production environments (Frontend subdomains, API versions, ML models).
*   **Daily/Weekly/Monthly Reports:** Status updates, burn-down metrics, and security/infrastructure summaries generated at recurring intervals. Daily reports (standups) involve all engineers; Weekly/Monthly reports are elevated to leadership and management roles (PMs, Architects, Security, Ops leads).
*   **Retrospective:** Post-mortem analysis and action items generated at the end of a sprint, epic, or major story cycle, involving all relevant stakeholders and engineers to adjust the zero-trust pipeline.

*(Note: Role definitions and specific scopes have been moved to `04-role-definitions.md`)*
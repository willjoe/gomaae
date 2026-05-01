# Data Accessibility & Masking Matrix

In a Zero-Trust Chain of Command, protecting the data payload is just as critical as protecting the infrastructure. The core principle of this matrix is **Data Minimization**: no human should ever have access to raw, unmasked production data unless absolutely necessary for an active incident, and even then, access must be individually audited, time-bound, and strictly limited.

### Core Data Security Principles
1. **No Shared Accounts:** There are no shared `db_admin` or `readonly_viewer` database users. Every database connection must be authenticated using the individual engineer's ephemeral JIT (Just-In-Time) credentials.
2. **Default to Synthetic:** Developers and QA engineers will **never** see real customer data. All development environments are populated exclusively with structurally accurate but entirely fake synthetic data.
3. **Irreversible Masking:** When production data must be used for analysis or model training, all Personally Identifiable Information (PII), Protected Health Information (PHI), and sensitive financial data must be irreversibly hashed, tokenized, or redacted at the pipeline level before the analyst or data scientist can query it.

---

### Data Environment Definitions

*   **[M] Synthetic / Mock Data:** Artificially generated datasets. Structurally identical to production (same schemas, constraints) but contains zero real customer information.
*   **[A] Aggregated / Statistical Data:** Pre-computed metrics, dashboards, and BI reports where individual records cannot be isolated or identified (e.g., "Daily Active Users", "Total Revenue").
*   **[S] Sanitized / Masked Production Data:** Real production records where all PII, PHI, and sensitive identifiers have been redacted, tokenized, or anonymized via automated data pipelines.
*   **[R] Raw Production Data (Read-Only):** The actual, live, unmasked production data. Access is strictly via "Break-Glass" JIT approval for critical incident response only.
*   **[W] Raw Production Data (Read/Write):** The ability to mutate live, unmasked production data. Restricted to automated CI/CD pipelines and highly audited, strictly bounded Database Admin break-glass scenarios.

---

### Zero-Trust Data Accessibility Matrix

If a data type is not marked with an explicitly defined access level for a role, the access is automatically **Deny-by-Default**.

| Role | Synthetic / Mock Data [M] | Aggregated / Stat Data [A] | Sanitized / Masked Data [S] | Raw Prod Data (Read) [R] | Raw Prod Data (Write) [W] |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Business Architect** | | A | | | |
| **Technical Architect**| M | A | | | |
| **Data Architect** | M | A | S | | |
| **Cloud Architect** | | A | | | |
| **Core PM** | | A | | | |
| **Technical PM** | | A | | | |
| **AI PM** | | A | | | |
| **Growth PM** | | A | | | |
| **Data PM** | | A | S | | |
| **Dependency Manager**| | A | | | |
| **Identity Engineer** | | | | | |
| **API Engineer** | M | | | | |
| **Integration Eng.** | M | | | | |
| **UI/UX Engineer** | M | | | | |
| **Frontend Web Eng.**| M | | | | |
| **Mobile Engineer** | M | | | | |
| **Data Engineer** | M | A | S | | |
| **Data Scientist** | M | A | S | | |
| **Analyst** | | A | S | | |
| **ML Engineer** | M | A | S | | |
| **Database Admin** | M | A | S | R *(Break-Glass)* | W *(Strict Break-Glass)* |
| **Functional QA Eng.**| M | | | | |
| **Performance QA Eng.**| M | | | | |
| **Accessibility QA** | M | | | | |
| **DevOps Engineer** | M | A | | | |
| **Site Reliability** | M | A | | R *(Break-Glass)* | |
| **MLOps Engineer** | M | A | | | |
| **DataOps Engineer** | M | A | S | | |
| **FinOps Engineer** | | A *(Billing/Cost)* | | | |
| **Security Engineer** | M | A | S | R *(Incident Response)* | |

---

### Implementation Guidelines by Role

#### Core Engineering (API, Integration, Frontend, Mobile)
*   **Data Access:** Exclusively **Synthetic / Mock Data [M]**.
*   **Rationale:** Developers do not need real customer names, emails, or transactions to write application logic. The CI/CD pipeline or DataOps team provides sandbox databases populated entirely with fake data generated via tools like Faker or synthetic data platforms.

#### Data & Analytics (Data Scientist, Analyst, ML Engineer)
*   **Data Access:** **Aggregated Data [A]** and **Sanitized / Masked Data [S]**.
*   **Rationale:** Analysts and Data Scientists require the statistical distribution and variance of real production data to build accurate dashboards and train effective machine learning models. However, they **do not** need to know the specific identities of the users. Automated ETL pipelines must strip/hash all PII/PHI before these roles can query the data warehouses (e.g., via BigQuery column-level security or dynamic data masking).

#### Quality Assurance (Functional, Performance, Accessibility)
*   **Data Access:** Exclusively **Synthetic / Mock Data [M]**.
*   **Rationale:** Similar to core developers, QA executes tests against simulated state. Performance QA may require massive volumes of data, but it is entirely generated script data, never cloned from production.

#### Infrastructure & Operations (DevOps, MLOps, FinOps, Delivery Manager)
*   **Data Access:** **Aggregated Data [A]** (Logs, Metrics, Cost, Traffic).
*   **Rationale:** Ops and Delivery roles manage the pipes and the routing, not the payload. They view telemetry, operational metadata, and infrastructure metrics, but have no access to the application data payload flowing through those systems.

#### Critical Response (Database Admin, SRE, Security)
*   **Data Access:** Standard access is Mock/Aggregated/Masked. They are the *only* roles permitted to request **Raw Prod Data [R] or [W]**.
*   **Rationale:** In a severe outage or security breach, an SRE or DBA may need to view actual raw data to diagnose corruption or a specific customer failure. This is handled via a **Break-Glass Workflow**:
    1.  The engineer requests temporary access via a specialized ticketing system.
    2.  Access is granted for a strictly limited window (e.g., 1 hour).
    3.  The session is completely audited, and all queries run against the raw data are logged and sent to Security for post-incident review.
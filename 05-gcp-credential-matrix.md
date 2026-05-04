# GCP Access Credential Matrix

This document maps the defined High-Integrity engineering roles to Google Cloud Platform (GCP) services. In a true High-Integrity architecture, standing privileges (permanent access) are eliminated. The permissions outlined below represent the **maximum allowable scope** an engineer can be granted via ephemeral, Just-In-Time (JIT) credentials tied strictly to an active, assigned Task ticket.

If a role does not have a permission listed for a service, access is strictly `Deny-by-Default` at the organizational policy level.

### Permission Legend
*   **[V] View (Read-Only):** Can list resources, read configurations, view logs, or query data (e.g., `roles/viewer`, `roles/bigquery.dataViewer`).
*   **[W] Write (Create/Update):** Can deploy code, update configurations, insert data, or create new service instances within bounded dev/test environments (e.g., `roles/editor`, `roles/run.developer`).
*   **[D] Delete (Destroy):** Can delete or tear down resources, drop tables, or remove infrastructure.
*   **[A] Admin (Manage Policy):** Can change IAM bindings, manage network perimeters, or handle cryptographic keys. Strictly limited to specialized Ops and Security roles.

---

### High-Integrity GCP Access Matrix

| Role | Compute<br>*(GKE, Run)* | DBs & Storage<br>*(SQL, GCS)* | Data & Analytics<br>*(BigQuery, Dataflow)* | ML & AI<br>*(Vertex AI)* | Identity<br>*(IAM, Secrets)* | CI/CD<br>*(Cloud Build)* | Observability<br>*(Logs, Metrics)* | Network & Sec<br>*(VPC, Armor)* | Billing<br>*(Budgets)* |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Business Architect** | | | | | | | | | V |
| **Technical Architect**| V | V | | | | V | V | V | |
| **Data Architect** | | V | V | | | | | | |
| **Cloud Architect** | V | V | V | V | V | V | V | V | V |
| **Core PM** | | | | | | | | | |
| **Technical PM** | | | | | | | V | | |
| **AI PM** | | | | V | | | V | | |
| **Growth PM** | | | V | | | | | | |
| **Data PM** | | | V | | | | | | |
| **Dependency Manager**| | | | | | | V | | |
| **Identity Engineer** | | | | | V/W/D/A | | V | | |
| **API Engineer** | V/W | V | | | V (Secrets) | V | V | | |
| **Integration Eng.** | V/W | V | | | V (Secrets) | V | V | | |
| **UI/UX Engineer** | | V/W (GCS) | | | | | | | |
| **Frontend Web Eng.**| V/W | V/W (GCS) | | | | V | V | | |
| **Mobile Engineer** | | | | | | | V (Crashlytics)| | |
| **Data Engineer** | | V/W | V/W/D | | V (Secrets) | V | V | | |
| **Data Scientist** | | V | V/W | V/W | | | | | |
| **Analyst** | | | V | | | | | | |
| **ML Engineer** | | V/W | V | V/W/D | V (Secrets) | V | V | | |
| **Database Admin** | | V/W/D/A| | | V (Secrets) | | V | | |
| **Functional QA Eng.**| V | V | | | | V | V | | |
| **Performance QA Eng.**| V/W | V | | | | V | V | | |
| **Accessibility QA** | V | | | | | V | | | |
| **Delivery Manager** | A (Routing) | | | | | V | V | V/W (Armor/CDN) | |
| **DevOps Engineer** | V/W/D | V/W | | | V | V/W/D/A | V/W | V | |
| **Site Reliability** | V/W | V | V | V | V | V/W | V/W/D | V | |
| **MLOps Engineer** | | V | | V/W/D | V (Secrets) | V/W/D | V/W | | |
| **DataOps Engineer** | | V | V/W/D | | V (Secrets) | V/W/D | V/W | | |
| **FinOps Engineer** | V | V | V (Billing) | V | | | | | V/W/A |
| **Security Engineer** | V | V | V | V | V/A | V | V/W | V/W/D/A | |

---

### Service Access Definitions by Domain

#### 1. Compute (GKE, Cloud Run, Cloud Functions, Compute Engine)
*   **Developers (API, Integration, Frontend):** Granted **V/W** exclusively within isolated Sandbox/Dev environments to deploy containerized code. They have zero access to Production compute.
*   **DevOps / SRE:** Granted **V/W/D** to manage infrastructure clusters, trigger deployments, and execute Chaos testing across higher environments. SREs have restricted Write access to Prod for emergency remediation.

#### 2. Databases & Storage (Cloud SQL, Spanner, Bigtable, Cloud Storage)
*   **Database Admin:** Granted full **V/W/D/A** lifecycle control over relational and NoSQL database instances.
*   **Engineers:** Granted **V** (Read) to mock DB environments. Production data access is strictly prohibited and governed by data masking policies. UI/UX and Frontend engineers might have **V/W** on Cloud Storage buckets strictly for hosting static assets.

#### 3. Data & Analytics (BigQuery, Dataflow, Pub/Sub, Dataproc)
*   **Data Engineers / DataOps:** Granted **V/W/D** to build, deploy, and maintain data pipelines. 
*   **Analysts / Data PMs:** Granted **V** (Read) access to specific, sanitized, and aggregated BigQuery datasets for reporting.

#### 4. ML & AI (Vertex AI)
*   **Data Scientists / ML Engineers:** Granted **V/W** access to Vertex AI Notebooks, Model Registry, and training pipelines to build and evaluate models.
*   **MLOps Engineer:** Handles the productionization, granting them **V/W/D** to manage Vertex AI Endpoints and continuous training pipelines.

#### 5. Identity (IAM, Secret Manager)
*   **Identity Engineer:** Exclusively holds **W/D/A** over IAM policies, Service Accounts, and Secret Manager.
*   **Other Engineers:** Automatically injected with Ephemeral **V** (View) access to specific Secret Manager payloads (e.g., API keys) required for their sandbox by the CI pipeline. They cannot create or rotate secrets.

#### 6. CI/CD (Cloud Build, Artifact Registry)
*   **DevOps / MLOps / DataOps:** Granted **V/W/D/A** to construct CI/CD pipelines, configure build triggers, and manage container registries.
*   **Core Developers:** Granted **V** (Read) to view pipeline execution logs for their submitted tasks to debug automated testing failures.

#### 7. Observability (Cloud Monitoring, Cloud Logging, Cloud Trace)
*   **SRE / Ops:** Granted **V/W/D** to create metrics, alerting policies, and dashboards.
*   **Engineers & QA:** Granted **V** (Read) to view application logs to debug issues within their authorized scopes.

#### 8. Network & Security (VPC, Cloud Armor, Cloud KMS, Security Command Center)
*   **Security Engineer:** Granted **V/W/D/A** to define firewall rules, WAF policies (Cloud Armor), manage KMS encryption rings, and monitor SCC.
*   **Cloud Architect & Ops:** Granted **V** to review network topologies.

#### 9. Billing (Cloud Billing, Cost Management)
*   **FinOps Engineer:** Exclusively holds **V/W/A** to set up billing alerts, budgets, and quota limits to prevent cost overruns.
*   **Architects:** Granted **V** to ensure designs meet budgetary constraints.
inOps Engineer:** Exclusively holds **V/W/A** to set up billing alerts, budgets, and quota limits to prevent cost overruns.
*   **Architects:** Granted **V** to ensure designs meet budgetary constraints.

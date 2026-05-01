# Engineer Role Definitions

In the Zero-Trust Chain of Command architecture, engineering and management roles are strictly defined. This prevents engineers from generating deliverables outside their purview and guarantees appropriate separation of concerns.

### Architecture
*   **Business Architect:** Aligns technology strategy with business goals, defines the highest-level epics, and ensures cross-departmental requirements are met.
*   **Technical Architect:** Designs application-level system components, establishes coding standards, and oversees software architecture and domain boundaries.
*   **Data Architect:** Designs the overarching enterprise data models, defines data governance, and establishes data warehousing strategy.
*   **Cloud Architect:** Designs the overarching infrastructure topology, networking strategy, security parameters, and cloud deployment models.

### Product Management
*   **Core PM:** Defines business requirements, scopes epics/stories, and provides final sign-off ensuring alignment with user needs. *(Primary Stakeholder: End User. Hardest Part: Deciding what not to build.)*
*   **Technical PM:** Translates technical constraints into product requirements, managing complex architectural or backend epics. *(Primary Stakeholder: Engineers / Architects. Hardest Part: Translating "business speak" to "system speak".)*
*   **AI PM:** Manages AI/ML initiatives, defining model success metrics and integrating them into the core product. *(Primary Stakeholder: Data Scientists. Hardest Part: Handling the unpredictability of AI outputs.)*
*   **Growth PM:** Focuses on user acquisition, retention, and monetization funnels, running experiments and A/B tests. *(Primary Stakeholder: Marketing / Finance. Hardest Part: Finding a 1% improvement in a massive funnel.)*
*   **Data PM:** Treats data as a product, managing analytics pipelines, internal dashboards, and governance tools. *(Primary Stakeholder: Analysts / Leadership. Hardest Part: Maintaining "one version of the truth" in data.)*
*   **Dependency Manager:** Orchestrates cross-domain tickets and workflows. Manages the "Blocked" queue, tracks dependency metadata (`blocked_by` / `blocking`), and acts as the authoritative diplomat to clear execution bottlenecks across isolated teams.

### Core Engineering
*   **Identity Engineer:** Centralizes the creation and management of all secrets, ephemeral credentials, API keys, and public-facing user identities to ensure developers do not have raw access to sensitive auth data.
*   **API Engineer:** Develops core server-side logic, internal/external APIs, and microservices in isolated environments.
*   **Integration Engineer:** Focuses on integrating third-party services, external APIs, and legacy systems with the core application logic.
*   **UI/UX Engineer:** Translates design prototypes into reusable, accessible frontend components and styling systems.
*   **Frontend Web Eng.:** Implements client-side business logic, state management, and API integrations for web applications.
*   **Mobile Engineer:** Develops native or cross-platform applications for iOS and Android environments.

### Data & Machine Learning
*   **Data Engineer:** Builds and maintains the data pipelines (ETL/ELT) responsible for moving and transforming large datasets.
*   **Data Scientist:** Analyzes data to construct predictive models, algorithms, and complex statistical insights.
*   **Analyst:** Focuses on business intelligence, creating dashboards, and running queries to extract actionable insights from data.
*   **ML Engineer:** Bridges software engineering and data science to productize machine learning models, integrating them into backend systems.
*   **Database Admin:** Specializes in database schema design, migrations, indexing, and query optimization.

### Quality Assurance (QA) & Security
*   **Functional QA Eng.:** Writes automated integration and end-to-end (E2E) tests against completed dev builds to ensure core business logic and workflows are functionally correct.
*   **Performance QA Eng.:** Develops load testing scripts, stress tests, and benchmarking suites to analyze system scalability and performance under peak traffic conditions.
*   **Accessibility QA Eng.:** Audits user interfaces and writes automated checks to ensure strict compliance with accessibility standards (WCAG) and inclusive usability guidelines.
*   **Security Engineer:** Audits architecture, writes security/penetration tests, and manages compliance guardrails across both the application and infrastructure layers.

### Operations (Ops)
*   **Delivery Manager:** Manages multiple concurrent production environments, toggling live traffic between active frontend subdomains, API versions, and ML models via the Delivery Dashboard.
*   **DevOps Engineer:** Focuses on developer velocity, managing CI/CD pipelines, build automation, and infrastructure for development/staging environments.
*   **Site Reliability (SRE):** Focuses on production uptime, creating observability dashboards, configuring auto-scaling infrastructure, and conducting chaos engineering.
*   **MLOps Engineer:** Deploys and manages the lifecycle of machine learning models in production, handling GPU infrastructure and model serving pipelines.
*   **DataOps Engineer:** Ensures the reliability of production data flows by managing Airflow/ETL infrastructure and data quality monitoring systems.
*   **FinOps Engineer:** Implements cloud cost-control policies and creates financial dashboards to monitor and optimize infrastructure spending.

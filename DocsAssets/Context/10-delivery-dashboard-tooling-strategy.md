# Delivery Dashboard Tooling Strategy

In our High-Integrity architecture, the **Delivery Dashboard** serves as the central control plane for the **Delivery Manager** to route traffic across multiple concurrent production environments (Frontend subdomains, API versions, ML models).

As the architecture spans multiple types of compute (e.g., serverless, containers, managed ML platforms), the tooling strategy for the Delivery Dashboard must remain infrastructure-agnostic. We are explicitly **not limiting the architecture to Kubernetes** at this stage.

## Core Requirements for the Dashboard Tooling

Regardless of the final tool chosen, the Delivery Dashboard must support the following High-Integrity capabilities:
1.  **Decoupled Deployment vs. Release:** The tool must allow DevOps/CI to deploy code invisibly (dark launch) while restricting the actual routing of live user traffic to the Delivery Manager.
2.  **Platform Agnostic Routing:** It must interface with multiple routing layers, such as:
    *   GCP Cloud Load Balancing (for generic traffic splitting).
    *   App Engine / Cloud Run traffic splitting (for frontend/serverless).
    *   Vertex AI endpoint routing (for ML models).
3.  **High-Integrity Authentication:** The dashboard itself must enforce JIT (Just-In-Time) ephemeral credentials, ensuring that a Delivery Manager can only alter routing for the specific components defined in their active Atomic Task.
4.  **Granular Traffic Control:** Must support Canary releases (percentage-based routing), Blue-Green toggles, and Shadow deployments (duplicating traffic for ML testing without affecting the user response).

## Tooling Candidates Under Consideration

### 1. Internal Developer Portal (IDP) - e.g., Backstage
*   **Status:** Highly Considered.
*   **Rationale:** Backstage (or similar IDP frameworks) allows us to build a unified "single pane of glass." Instead of relying on a tool that dictates how infrastructure is run, Backstage can be customized with plugins that simply make API calls to GCP's routing services (e.g., updating a Cloud Armor policy or an App Engine traffic split). This perfectly supports a multi-compute environment (Serverless + K8s + Vertex AI) and integrates deeply with custom IAM JIT workflows.

### 2. Multi-Cloud Continuous Delivery Platforms - e.g., Spinnaker
*   **Status:** Alternative Option.
*   **Rationale:** Spinnaker was built exactly for this type of complex, multi-target, concurrent version routing. It natively understands App Engine, Compute Engine, and Kubernetes. However, it can be heavy to maintain and might introduce unnecessary complexity if our deployment targets remain primarily within the GCP ecosystem.

### 3. Native Cloud Provider Dashboards (GCP Console + Custom IAM)
*   **Status:** Baseline Fallback.
*   **Rationale:** GCP natively supports traffic splitting in App Engine, Cloud Run, and Vertex AI. By strictly scoping IAM roles, the Delivery Manager could theoretically use the native GCP Console. However, this lacks the streamlined, cross-domain "Dashboard" experience and relies heavily on complex, service-specific IAM conditions rather than a unified product release interface.

### 4. Kubernetes-Native Controllers (Argo Rollouts, Flagger)
*   **Status:** Deferred / Scoped.
*   **Rationale:** While these are industry standards for progressive delivery, they strictly mandate Kubernetes (GKE). Because we are remaining compute-agnostic (leveraging App Engine, etc.), these tools can only be considered for the specific subset of workloads running on GKE, rather than the unified Delivery Dashboard.

## Conclusion
The architecture will proceed with an **agnostic routing interface design**. The Delivery Manager's workflows will be defined by *capabilities* (traffic splitting, instant rollback, shadow routing) rather than being tied to a specific underlying technology like Istio or Kubernetes. Tools like Backstage remain a strong candidate for implementing this unified interface across heterogeneous compute environments.
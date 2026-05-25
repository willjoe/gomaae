# Multiple Production Environments & Delivery Management

In the Agentic Engineering, "production" is not a single, fragile environment where code is pushed and crossed fingers. Instead, production consists of **multiple, isolated, concurrently running environments**. This allows for zero-downtime deployments, rapid rollbacks, dark launching, and complex A/B testing without risking system stability.

Because core engineers are prohibited from altering production configurations, a dedicated role—the **Delivery Manager**—is responsible for routing live user traffic to these various environments using a centralized **Delivery Dashboard**.

---

## 1. Concurrent Production Environments by Domain

The concept of a "version" is handled differently depending on the engineering domain:

### Frontend (UI/UX, Web, Mobile Web)
*   **Subdomain Branching:** Every successful build of the frontend application is deployed to its own isolated production environment with a unique URL (e.g., `v2-1-4.prod.myapp.com`, `feat-x.prod.myapp.com`).
*   **Isolation:** These environments run concurrently. Deploying a new version has zero impact on the version currently serving live traffic.
*   **Routing:** The Delivery Manager configures the CDN or Load Balancer (via the Delivery Dashboard) to direct `www.myapp.com` to the specifically chosen active subdomain. 

### Backend (APIs & Microservices)
*   **Strict Versioning:** APIs must be versioned explicitly (e.g., RESTful `/v1/`, `/v2/` or GraphQL schema versions).
*   **Isolated Deployments:** A deployment of `v2` is spun up as an entirely separate cluster or container service. It does not replace or "overwrite" the `v1` environment.
*   **Deprecation Lifecycle:** Both `v1` and `v2` run concurrently in production until the Delivery Manager routes all traffic away from `v1` and the Cloud Architects/PMs officially deprecate it.

### Mobile Applications (Native iOS/Android)
*   **Staging Phase (Simulators/Emulators):** During development and PR gauntlet, the app is validated headlessly using browser-based simulators or containerized emulators.
*   **Internal Distribution Tracks:** Successful builds are automatically uploaded to internal tracks (e.g., **TestFlight** for iOS, **Google Play Internal Sharing** for Android).
*   **Cloud Device Farm Validation:** Before a release is considered "Final," the binary is executed on real physical hardware via Cloud Device Farms (e.g., BrowserStack, Firebase Test Lab). 
*   **Visual Evidence:** The resulting video evidence from real devices is attached to the corresponding Story or Epic ticket, enabling the Delivery Manager to verify native performance and behavior before the official store submission.

### Machine Learning Models
*   **Model Registry Deployments:** When Data Scientists or ML Engineers finalize a model, it is saved to a model registry with a strict version hash.
*   **Concurrent Serving:** MLOps deploys multiple versions of the model as distinct endpoint services. 
*   **Traffic Splitting:** This allows the Delivery Manager to run "Shadow Deployments" (sending real traffic to a new model to observe outputs without affecting the user) or "Canary Releases" (routing 5% of traffic to the new model).

---

## 2. The Delivery Manager Role

The Delivery Manager operates exclusively at the routing layer. They do not write application code, nor do they provision the underlying compute infrastructure.

*   **Primary Responsibility:** Safeguarding the end-user experience by controlling which versions of the frontend, APIs, and ML models are receiving live traffic.
*   **High-Integrity Posture:** The Delivery Manager has **Admin (A)** access exclusively for configuring traffic splitting, DNS routing rules, and CDN caching policies. They cannot mutate the deployed containers or access raw production data.

---

## 3. The Delivery Dashboard

The **Delivery Dashboard** is the centralized control plane utilized by the Delivery Manager. It provides a visual interface over the complex routing rules of the cloud provider (e.g., GCP Cloud Armor, Load Balancing, App Engine Traffic Splitting).

### Key Features of the Dashboard:
1.  **Environment Toggling:** A simple interface to switch the "Main" production pointer between available frontend subdomains or API clusters.
2.  **Traffic Splitting (Canary/Blue-Green):** The ability to set granular rules (e.g., "Send 10% of iOS users to API `v2`, keep 90% on `v1`").
3.  **Instant Rollback:** If the telemetry displays an error spike on a newly activated environment, the Delivery Manager can click a single button to reroute traffic back to the previous, stable environment instantly.
4.  **View-Only Access:** Read-only access to the Delivery Dashboard is granted to Product Managers, Architects, and QA Engineers so they can monitor exactly which versions are currently live without having the authority to change them.
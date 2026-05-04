# Secret Rotation & Compromise Remediation

In a High-Integrity Atomic Development, static credentials are a massive vulnerability. To mitigate the risk of credential theft, all secrets (database passwords, API keys, OAuth tokens) are centrally managed, dynamically injected, and frequently rotated.

This document outlines how secrets are handled using **GCP Secret Manager**, how they are periodically rotated, and how the organization responds to a detected leak.

---

## 1. Centralized Management via GCP Secret Manager

Engineers never hardcode secrets, nor do they pass `.env` files around. 
*   The **Identity Engineer** is the only role authorized to create, update, or define policies for secrets within GCP Secret Manager.
*   When a CI/CD pipeline deploys a container (e.g., to Cloud Run or GKE), the environment is configured to pull the required secrets directly from GCP Secret Manager into memory at runtime using workload identity federation. The payload never touches the disk.

---

## 2. Proactive (Periodic) Secret Rotation

To limit the blast radius of any theoretical, undetected leak, all secrets have an expiration date. 

1.  **Automated Refresh Cycles:** GCP Secret Manager is configured with automated rotation schedules (e.g., every 30, 60, or 90 days depending on the secret's sensitivity classification).
2.  **Rotation Cloud Functions:** When a rotation schedule triggers, Secret Manager calls a dedicated Cloud Function (written by the Identity Engineer). This function connects to the target service (e.g., Cloud SQL), generates a fresh password, updates the database, and saves the new password back to Secret Manager as the `latest` version.
3.  **Zero-Downtime Propagation:** Because applications fetch the `latest` secret from Secret Manager upon startup or via background polling, the new credentials propagate across the infrastructure automatically without requiring a code deployment.

---

## 3. The Delivery Dashboard: On-Demand Refresh

While rotations are fully automated, operational reality sometimes demands immediate manual intervention.

*   **The "Refresh Secrets" Trigger:** The **Delivery Dashboard** features an explicit "Refresh Secrets" button for each active environment.
*   **Delivery Manager Access:** If the Delivery Manager observes anomalous behavior in an environment or receives an alert, they can trigger this button. 
*   **Orchestrated Proxy:** The Delivery Manager does *not* have IAM permission to read or write the actual secrets. Clicking the button triggers an orchestrated CI/CD pipeline or Cloud Function that executes an immediate, out-of-band secret rotation and gracefully restarts the environment's containers to fetch the new payload.

---

## 4. Compromise Remediation (Leak Detection Protocol)

If a secret is leaked, the High-Integrity system relies on immediate detection and automated remediation.

### The Leak Detection Layer
1.  **Pre-Commit Auditing:** Tools like `TruffleHog` or `gitleaks` run locally before a commit is accepted, using high-entropy checks and regex patterns to block the commit of anything resembling a key.
2.  **Repository Scanning:** GitHub Advanced Security (or GCP Security Command Center) actively scans the central trunk.
3.  **External Monitoring:** Services monitor public GitHub repositories, Pastebin, and the dark web for the organization's unique key signatures.

### The Automated Remediation Workflow
If a leak is detected:
1.  **Instant Invalidation:** An automated webhook instantly disables the leaked secret version in GCP Secret Manager and revokes the associated Service Account or API Key.
2.  **Forced Rotation:** The automated rotation Cloud Function is immediately triggered to generate a replacement credential.
3.  **Alerting the High-Integrity Atomic Development:** An urgent incident ticket is automatically generated for the **Identity Engineer** and **Security Engineer** to conduct a forensic audit to determine *how* the secret bypassed the pre-commit hooks, while the **Delivery Manager** monitors the dashboard to ensure the active environments recovered successfully with the new keys.
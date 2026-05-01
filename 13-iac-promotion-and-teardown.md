# Infrastructure as Code (IaC) Promotion & Teardown

In a Zero-Trust architecture, modifying foundational infrastructure (networks, databases, compute clusters) carries significantly more risk than deploying application code. Therefore, Infrastructure as Code (IaC) workflows—typically executed by DevOps, SRE, or Cloud Architects—require a distinct validation and approval pipeline.

---

## 1. IaC Pre-Commit and CI/CD Validation

When an engineer submits an IaC pull request (e.g., using Terraform), the CI/CD pipeline executes an immediate, non-destructive validation suite:

1.  **Automated Static Analysis:** Tools like `tfsec` or `checkov` scan the code for security misconfigurations (e.g., public S3 buckets, missing encryption).
2.  **The Dry Run (`terraform plan`):** The pipeline automatically executes a `terraform plan` against a mirrored state. The output is appended directly to the Pull Request for reviewers to read exactly what resources will be created, modified, or destroyed.
3.  **Visual Architectural Review (`terraform graph`):** To prevent configuration drift and ensure the PR matches the original design, the pipeline generates a visual dependency graph using `terraform graph`. This visual map is required for the designated **Cloud Architect** or **Security Engineer** to verify that the proposed state perfectly aligns with the original Architecture Decision Records (ADRs).

---

## 2. Infrastructure Promotion & Alignment

Infrastructure changes are never merged blindly by a single engineer.

1.  **Strict Review Assignment:** The IaC Atomic Task explicitly defines the reviewers. For any infrastructure modification, at least one **Cloud Architect** and one **Security Engineer** must review the `terraform plan` and the `terraform graph`.
2.  **Architectural Alignment:** The Cloud Architect compares the visual graph against the documented specifications. If the infrastructure deviates from the approved ADRs, the PR is rejected.
3.  **Empirical Testing in Lower Environments:** Once merged, the infrastructure changes are promoted through the lower environments (Sandbox, QA). Only after the environment tests pass is the code promoted to production via the CI/CD pipeline.

---

## 3. Safe Teardown & Deletion Protocols

Destroying infrastructure—particularly databases and storage—is the most dangerous operation in a cloud environment. In this Zero-Trust system, deletions require multiple layers of automated verification.

### Database & Table Teardown Safeguards

To delete a database or a table, the teardown must be executed systematically across three distinct revisions:

1.  **Pipeline Revision:** The CI/CD deployment pipeline must be updated to remove references to the targeted database/table.
2.  **Environment Revision:** The IaC (Terraform) state is updated to mark the resource for destruction.
3.  **Data Revision:** The final, absolute safeguard. The pipeline will query the target table or database. **A table or database can ONLY be deleted if it is mathematically empty.**

### The Execution Flow for Deletion:
*   If an SRE or DBA attempts to merge a `terraform destroy` or DDL `DROP TABLE` command, the pipeline queries the row count of the target table.
*   If `COUNT(*) > 0`, the CI pipeline strictly blocks the destruction. 
*   To proceed with deletion, a Data Engineer or DBA must first execute an approved, audited data archiving/migration task that empties the table. Only when the table is empty will the pipeline unlock the destruction command, ensuring that no production data is ever accidentally deleted via an infrastructure teardown.
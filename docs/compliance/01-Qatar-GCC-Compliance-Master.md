# Tiryaq Hospital Platform — Qatar / GCC Compliance Master Document

**Document version:** 1.0
**Date:** 2026-04-29
**Owner:** Sami Taha
**Scope:** Tiryaq Hospital Platform (multi-tenant SaaS, AWS-hosted)
**Target jurisdictions:** Qatar (primary), UAE & Saudi Arabia (planned expansion)

---

## 1. Purpose

This document describes the regulatory and security compliance framework that the Tiryaq Hospital Platform must meet to operate lawfully in Qatar and the wider GCC region. It also defines what compliance responsibility looks like in practice — at the architectural, operational, and contractual levels.

This is the master reference. Companion documents:
- `02-Tiryaq-Compliance-Status.md` — current compliance state of the Tiryaq codebase.
- `updates/` — dated delta documents, one per applied compliance update.

---

## 2. Terms & Definitions (Glossary)

This section defines every acronym and regulatory term used throughout the document.

### 2.1 Regulatory bodies

| Term | Full name | Description |
|------|-----------|-------------|
| **MOPH** | Ministry of Public Health (Qatar) | Qatar's health regulator. Sets clinical, safety, licensing, and data residency rules for all healthcare providers and their software. |
| **HMC** | Hamad Medical Corporation | Qatar's largest public hospital operator. Operates on Cerner. Reference for interoperability, not direct regulator. |
| **PHCC** | Primary Health Care Corporation | Qatar's public primary-care network. Reference for primary-care workflows. |
| **NHS Qatar** | National Health Strategy | Qatar's national digital health roadmap. Influences certification expectations. |
| **NCSA** | National Cyber Security Agency (Qatar) | Cybersecurity regulator. Issues controls that overlay PDPPL for critical sectors including health. |
| **DHA** | Dubai Health Authority | Regulator for Dubai-licensed clinics. |
| **DOH** | Department of Health, Abu Dhabi | Regulator for Abu Dhabi-licensed clinics. |
| **MOHAP** | Ministry of Health & Prevention (UAE federal) | Regulator for federally-licensed UAE clinics. |
| **CCHI / NPHIES** | Council of Cooperative Health Insurance / National Platform for Health Information Exchange Services (Saudi Arabia) | KSA's mandatory claims and clinical data platform. |
| **SCFHS** | Saudi Commission for Health Specialties | KSA clinician licensing body. |
| **SFDA** | Saudi Food & Drug Authority | KSA prescription/pharmaceutical regulator. |

### 2.2 Laws & frameworks

| Term | Full name | Description |
|------|-----------|-------------|
| **PDPPL** | Personal Data Privacy Protection Law (Qatar Law No. 13 of 2016) | Qatar's general data protection law. Functions as a GDPR-lite framework. Applies to all processing of personal data of individuals in Qatar. |
| **GDPR** | General Data Protection Regulation (EU) | Reference framework. PDPPL is modeled on GDPR principles but is narrower in scope. |
| **PDPL (KSA)** | Personal Data Protection Law (Royal Decree M/19, 2021) | Saudi Arabia's data protection law. Has data localization clauses. |
| **UAE PDPL** | Federal Decree-Law No. 45 of 2021 | UAE's federal personal data protection law. Health data is treated as sensitive personal data. |
| **PHI** | Protected Health Information | Any patient-identifiable health data: name + diagnosis, prescriptions, lab results, clinical notes, etc. |
| **PII** | Personally Identifiable Information | Any data that can identify an individual: name, QID, phone, email, address. |
| **DPA** | Data Processing Addendum | Contractual addendum between data controller and processor (e.g., between Tiryaq and AWS) defining processing duties. |
| **BAA** | Business Associate Agreement | US-specific contract under HIPAA. Not legally required in Qatar/GCC, but the AWS Enterprise Agreement DPA serves the equivalent function. |
| **SLA** | Service Level Agreement | Uptime/performance contract — required by MOPH for hosted clinical software. |
| **RTO / RPO** | Recovery Time Objective / Recovery Point Objective | Maximum acceptable downtime / maximum acceptable data loss in a disaster. |

### 2.3 Technical security terms

| Term | Description |
|------|-------------|
| **Encryption at rest** | Data is encrypted while stored (in the database, on disk, in S3). |
| **Encryption in transit** | Data is encrypted while moving over a network (TLS / HTTPS). |
| **CMK** | Customer Managed Key — KMS encryption key created and controlled by the customer (you), not AWS. Required for high-assurance health data. |
| **AWS-managed key** | KMS key created and rotated by AWS. Easier to operate but offers less customer control. |
| **KMS** | AWS Key Management Service. Manages encryption keys. |
| **OAC** | Origin Access Control — CloudFront feature that locks an S3 bucket so only that distribution can read it. |
| **WAF** | Web Application Firewall — filters malicious HTTP traffic (SQL injection, XSS, common exploits) before it hits your app. |
| **MFA** | Multi-Factor Authentication. |
| **JWT** | JSON Web Token. Used by Cognito to assert identity to API Gateway. |
| **RBAC** | Role-Based Access Control. Tiryaq uses Cognito groups: Admin, Developers, Doctors, Pharmacists. |
| **Audit log** | Immutable record of every access and change. PDPPL requires this. Two layers: application audit (who did what in the app) and infrastructure audit (who changed AWS resources). |
| **CloudTrail** | AWS service that records every AWS API call. Provides infrastructure-level audit. |
| **Tenant isolation** | Mechanism that prevents one customer (clinic) from reading another customer's data in a multi-tenant SaaS. |
| **Data residency** | Legal requirement that personal data must remain within a specific country or region. |
| **Data classification** | Labeling each data record with its sensitivity level (PHI, PII, public). Enables breach scoping and access control. |
| **Data retention** | Policy defining how long data is kept before deletion or archival. |
| **Pseudonymisation** | Replacing identifiers (name, QID) with tokens, so the data alone cannot identify a person. |
| **Anonymisation** | Removing all identifying information so re-identification is impossible. |
| **Breach notification** | Legal duty to notify regulators and affected individuals when PHI is exposed. PDPPL: 72 hours. |
| **VPC** | Virtual Private Cloud — private network in AWS. Adds isolation for sensitive workloads. |
| **VPC endpoint** | Private connection from a VPC to an AWS service without traversing the public internet. |
| **TLS** | Transport Layer Security — the modern replacement for SSL. Required for all PHI in transit. Minimum version 1.2. |

### 2.4 Healthcare-specific terms

| Term | Description |
|------|-------------|
| **EMR / EHR** | Electronic Medical Record / Electronic Health Record. Tiryaq is an EMR. |
| **SOAP note** | Subjective, Objective, Assessment, Plan — standard structure for clinical documentation. |
| **ICD-10** | International Classification of Diseases (revision 10) — diagnostic coding standard. |
| **CPT** | Current Procedural Terminology — US billing codes. Less relevant in Qatar/GCC (local code sets vary). |
| **FHIR** | Fast Healthcare Interoperability Resources — modern healthcare data exchange standard. Adopted regionally for HIE integration. |
| **HL7 v2** | Older messaging standard, still used by hospital systems (HMC, Malaffi). |
| **HIE** | Health Information Exchange — regional platform for sharing patient data across providers. UAE: Malaffi, NABIDH. KSA: NPHIES. Qatar: emerging. |
| **e-Prescribing** | Electronic prescription transmission to pharmacies. |
| **EPCS** | Electronic Prescribing of Controlled Substances. Stricter requirements (DEA in US). Qatar/GCC equivalents are evolving. |

---

## 3. Qatar Regulatory Framework

### 3.1 PDPPL (Law No. 13 of 2016) — primary obligation

PDPPL governs the processing of personal data in Qatar. It applies to Tiryaq because we process personal data of Qatari residents (patients, doctors, staff).

**Core obligations:**

1. **Lawful basis for processing.** Tiryaq must obtain explicit consent or operate under another lawful basis (treatment, legal obligation).
2. **Purpose limitation.** Data collected for treatment cannot be repurposed (e.g., for marketing) without new consent.
3. **Data minimization.** Collect only what is necessary for the stated purpose.
4. **Accuracy.** Patients have the right to correct inaccurate data.
5. **Storage limitation.** Data must not be kept longer than necessary. Retention periods must be defined.
6. **Integrity & confidentiality.** Technical and organizational measures must protect against unauthorized access, loss, destruction.
7. **Accountability.** The controller (Tiryaq's customer — the clinic) must be able to demonstrate compliance.
8. **Data subject rights.** Access, rectification, erasure, portability, objection.
9. **Cross-border transfers.** Personal data may not be transferred outside Qatar without adequate safeguards or explicit consent.
10. **Breach notification.** Notify the Compliance and Data Protection Department within 72 hours of becoming aware of a breach.

**Penalties:** Up to QAR 5,000,000 (approximately USD 1.37M) per violation.

### 3.2 MOPH expectations for clinical software

MOPH does not publish a single "EMR certification" equivalent to ONC, but enforces:

1. **Data residency** — patient data must reside in Qatar, or be subject to documented cross-border processing approval.
2. **Clinical safety** — software changes that affect clinical decisions must be tested and documented.
3. **Audit trail** — every access to a patient record must be logged with user, timestamp, and action.
4. **Access control** — only authenticated, authorized clinicians may access PHI.
5. **Backup and recovery** — defined RTO/RPO, regular tested backups.
6. **Vendor stability** — operating company must be registered, with named accountable executives.
7. **Interoperability** — software should be able to export patient records in a standard format on patient request.

### 3.3 NCSA controls

For platforms processing health data at scale, NCSA's National Information Assurance (NIA) standards apply, including:

- Network segmentation
- Logging and monitoring
- Incident response plans
- Vulnerability management
- Annual third-party security assessment

---

## 4. GCC Regional Overview (planned expansion)

### 4.1 United Arab Emirates

- **UAE PDPL (Federal)** — health data is "sensitive personal data" requiring elevated protection.
- **DHA (Dubai)** — operates **NABIDH** HIE. Tiryaq must integrate with NABIDH to operate in Dubai.
- **DOH (Abu Dhabi)** — operates **Malaffi** HIE. Mandatory integration for Abu Dhabi clinics.
- **MOHAP (federal emirates)** — owns federal licensing.
- Data residency: not absolute, but cross-border transfers require notification/approval.

### 4.2 Saudi Arabia

- **PDPL (Royal Decree M/19, 2021)** — strict localization clauses. Personal data of KSA residents should be processed within KSA.
- **NPHIES** — mandatory for all health insurance claims and clinical data exchange. Non-negotiable.
- **SFDA** — pharmacy and prescription regulation. SFDA codes for medications.
- **SCFHS** — clinician licensing validation.
- AWS Saudi Arabia region (Riyadh, `me-central-2`) is now available for full data residency.

### 4.3 Kuwait, Bahrain, Oman

- Smaller markets. Frameworks under development. Regional approach: process in `me-south-1` (Bahrain), align with Qatar PDPPL as the default, customize per market as licensing materializes.

---

## 5. Compliance Requirements Matrix

This matrix maps each obligation to the technical control needed in Tiryaq.

| # | Obligation | Source | Technical control | Tiryaq layer |
|---|------------|--------|-------------------|--------------|
| 1 | Data residency in Qatar (or approved region) | MOPH, PDPPL | AWS region pinned to `me-south-1` | CDK |
| 2 | Encryption at rest | PDPPL Art. 9 | KMS CMK on DynamoDB, S3, Lambda env | CDK |
| 3 | Encryption in transit | PDPPL Art. 9 | TLS 1.2+ everywhere; CloudFront HTTPS-only; API Gateway HTTPS | CDK |
| 4 | Strong authentication | PDPPL Art. 9 | Cognito password policy 12+ chars + symbols, MFA mandatory for clinical roles | CDK |
| 5 | Role-based access | PDPPL Art. 9 | Cognito groups + JWT claims + Lambda authorization checks | CDK + Lambda |
| 6 | Application audit log | MOPH, PDPPL | `tiryaq-audit` Lambda + audit DynamoDB items | Lambda |
| 7 | Infrastructure audit log | NCSA NIA | CloudTrail organization trail, immutable S3 bucket | CDK |
| 8 | Breach notification within 72h | PDPPL Art. 14 | EventBridge → SNS pipeline for security findings | CDK |
| 9 | Data subject rights (access, rectification, erasure) | PDPPL Art. 16-22 | Patient self-service endpoints + admin tooling | Lambda + Angular |
| 10 | Data minimization | PDPPL Art. 4 | Only required fields stored; review on every schema change | Process |
| 11 | Data retention policy | PDPPL Art. 7 | DynamoDB TTL on transient data; documented retention table | CDK + Lambda |
| 12 | Data classification | NCSA NIA | `dataClass` attribute on every DynamoDB item (PHI, PII, PUBLIC, AUDIT) | Lambda |
| 13 | Backup and recovery | MOPH | DynamoDB PITR (35 days), daily on-demand backup with 7-year retention | CDK |
| 14 | Tenant isolation | SaaS architecture | `tenantId` partition prefix; Cognito custom attribute; deny cross-tenant queries | Lambda |
| 15 | WAF protection | NCSA NIA | AWS WAFv2 on CloudFront with managed rules + rate limit | CDK |
| 16 | DDoS protection | NCSA NIA | AWS Shield Standard (free, automatic on CloudFront) | CDK |
| 17 | Vulnerability management | NCSA NIA | npm audit / dependabot; AWS Inspector for Lambda | Process + CDK |
| 18 | Secure SDLC | MOPH | Pull request review, no hardcoded secrets, secrets in SSM/Secrets Manager | Process |
| 19 | Cross-border transfer controls | PDPPL Art. 25 | Documented approval for any LLM/Bedrock cross-region calls | Process + CDK |
| 20 | Patient consent capture | PDPPL Art. 4 | Consent record in DynamoDB linked to patient | Lambda + Angular |
| 21 | Data Processing Agreement with AWS | PDPPL Art. 23 | AWS Enterprise Agreement DPA executed | Contractual |
| 22 | Vendor management | MOPH | Sub-processor list maintained (AWS, Bedrock region, SES, SNS) | Process |
| 23 | Incident response plan | NCSA NIA | Documented runbook, on-call rotation, tabletop exercises | Process |
| 24 | Annual security assessment | NCSA NIA | Third-party pen test annually | Process |
| 25 | Clinical safety | MOPH | Change control for AI features; validation of SOAP/ICD-10 outputs | Process |

> **Control #19 — documented cross-border transfer (ScribeFirst SOAP generation).**
> The ScribeFirst voice-scribe sends the consultation transcript (classified **PHI**) to Amazon Bedrock for SOAP structuring. As of **2026-05-24** this uses **Claude Haiku 4.5**, invoked through the **US cross-region inference profile** `us.anthropic.claude-haiku-4-5-20251001-v1:0`. Because it is a *cross-region* inference profile, Bedrock may process the request in any of **us-east-1, us-east-2, or us-west-2** — all outside the `me-south-1` data-residency region.
>
> This transfer is approved under PDPPL Art. 25 on the basis that: (a) the transcript is transient and is **not persisted as audio**; (b) only the free-text transcript leaves the region, not the wider patient record; (c) patient consent to AI-assisted documentation is captured **before** recording (control #20); and (d) AWS is a contracted sub-processor under the executed DPA (control #21).
>
> **Technical scoping:** the `tiryaq-scribe` Lambda IAM policy restricts `bedrock:InvokeModel` to this inference-profile ARN plus its three underlying regional foundation-model ARNs (`us-east-1`/`us-east-2`/`us-west-2`) only. The Bedrock region is set via `BEDROCK_REGION=us-east-1`. **Superseded:** the original `anthropic.claude-3-haiku-20240307` model was retired/marked legacy by the provider and is no longer used.

---

## 6. Architectural Compliance Posture (target state)

Target Tiryaq architecture once all updates are applied:

```
              ┌─────────────────────────────────────────┐
              │  AWS Account (me-south-1, Bahrain)      │
              │  AWS Org with CloudTrail enabled        │
              └─────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
   ┌────▼─────┐         ┌─────▼──────┐        ┌─────▼──────┐
   │ WAFv2    │  HTTPS  │ CloudFront │  TLS   │ API GW     │
   │ Managed  │────────▶│ + OAC      │───────▶│ HTTP API   │
   │ Rules    │         │            │        │ + JWT auth │
   └──────────┘         └─────┬──────┘        └─────┬──────┘
                              │                     │
                        ┌─────▼──────┐        ┌─────▼──────┐
                        │ S3 (CMK)   │        │ Lambda     │
                        │ versioning │        │ (Node.js)  │
                        │ + lifecycle│        │ tenantId   │
                        └────────────┘        │ enforced   │
                                              └─────┬──────┘
                                                    │
                                              ┌─────▼──────┐
                                              │ DynamoDB   │
                                              │ CMK + PITR │
                                              │ TTL + tags │
                                              └────────────┘

   Identity:  Cognito (MFA, 12+ char password, pre-token Lambda)
   Audit:     tiryaq-audit Lambda + CloudTrail → S3 audit bucket (Object Lock)
   Alerting:  EventBridge → SNS → Slack + email (breach pipeline)
   Backup:    DynamoDB PITR + on-demand vault, S3 versioning
```

---

## 7. Roles & Responsibilities

| Party | Role under PDPPL | Responsibilities |
|-------|------------------|------------------|
| The clinic (Tiryaq customer) | Data Controller | Determines purpose of processing; obtains patient consent; responds to data subject requests. |
| Tiryaq (the company) | Data Processor | Processes data on behalf of the clinic; implements technical controls; reports breaches to the controller. |
| AWS | Sub-processor | Provides infrastructure; signs DPA; responsible for physical and platform security. |
| Bedrock LLM provider (when used) | Sub-processor | Same as AWS, with cross-border processing if not in `me-south-1`. |

---

## 8. Compliance Operating Model

A one-time compliant deployment is not enough. PDPPL and MOPH expect ongoing operation.

| Cadence | Activity |
|---------|----------|
| Continuous | Monitoring (CloudWatch alarms, GuardDuty, Security Hub) |
| Weekly | Review failed login attempts, suspicious access patterns |
| Monthly | KMS key usage review, IAM access review |
| Quarterly | Restore test from PITR, breach tabletop exercise |
| Annually | Third-party penetration test, DPA review with AWS, retention policy review, NCSA self-assessment |
| On change | Privacy impact assessment for any new feature touching PHI |
| On incident | Breach notification within 72 hours; root cause; corrective action |

---

## 9. Document control

| Version | Date | Author | Change |
|---------|------|--------|--------|
| 1.0 | 2026-04-29 | Sami Taha | Initial issuance |

Companion docs:
- `02-Tiryaq-Compliance-Status.md`
- `updates/2026-04-29-update-01-region-cors.md` (and subsequent updates)

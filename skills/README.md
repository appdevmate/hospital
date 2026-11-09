# Akwadona Skills — project-scoped Claude skills

Eight skills to make work on this project rigorous, consistent, and safe. Each is a self-contained `SKILL.md` with YAML frontmatter — the `description` field is what triggers invocation.

## Install

Move the `skills/<name>/` folders to wherever your Claude client reads project skills. For Claude Code:

```powershell
# From the repo root:
Move-Item -Force skills\* .claude\skills\
```

(The `.claude/` folder is protected during this session, so these were authored at `skills/` instead — move them yourself.)

## The eight skills

| Skill | When it triggers | What it enforces |
|---|---|---|
| **akwadona-security-review** | Any change to Lambda handlers, Angular, CDK, SQL/PartiQL, or shell scripts that touches tenant data | Zero-knowledge boundaries, per-tenant isolation, PHI encryption, JWT handling, DynamoDB access patterns, IAM least-privilege, the `updatedAt: null` GSI landmine |
| **akwadona-code-standards** | Any code edit on the platform | Lambda factory + inline helpers, JWT claim parsing, CRUD patterns, catch-all routes, CFN resource budget, deploy flow, Angular signals + OnPush |
| **akwadona-solution-architect** | Designing a feature, module, or infra change | ADR-lite format, AWS Well-Architected pillars, 500-resource budget, trade-off language, patterns to reuse, anti-patterns to reject |
| **akwadona-deploy-safety** | Any mention of `deploy`, `ship`, `release`, `rollback`, `cdk deploy` | Live-ID verification before use, two-phase alias deploy post-teardown, KMS perms for S3 sync, cross-tenant probe before green-light, post-deploy checklist |
| **akwadona-competitive-positioning** | Writing customer-facing content, decks, RFPs, release notes, objection handling | Competitor-aware messaging grounded in actual architecture, ten ranked differentiators, three canonical objections + responses, language to use / avoid |
| **akwadona-doc-writer** | Writing or reviewing docs/ files, user-roles, CHANGELOG, API reference | Four-part explain pattern, taxonomy, skeleton, house style, audience-aware structure, deprecation banners |
| **akwadona-incident-response** | `the site is down`, `outage`, `500`, `security alert`, `tenant can't log in`, `audit log shows X` | Severity classification, ten-minute drill, containment-first, regulatory notification obligations, root-cause format, known failure modes |
| **akwadona-easy-english** | **Any** doc write/edit or chat about Akwadona | Short sentences, one real-life analogy per technical concept, every abbreviation expanded on first use (e.g., `**KMS** (Key Management Service)`), analogy bank, abbreviation glossary |

## Design philosophy

The skills are opinionated. They encode decisions already made (zero-knowledge, pooled multi-tenancy, PDPPL compliance, single-table DynamoDB) — not generic AWS best practices. Reach for them when the question is "how do we do this *here*", not "how do we do this *in general*".

Each skill produces structured output (verdict, recommendation, checklist, format). The idea is to make reviews reproducible and audits possible.

## Attribution

Authored by Claude Opus 4.7 (claude-opus-4-7) during the 2026-10-02 full-repo audit, after the May→October gap. Grounded in the document set (AKW-DR-00), `lib/akwadona-cdk-stack.ts`, and the `akwadona-cdk/lambda/*` sources.

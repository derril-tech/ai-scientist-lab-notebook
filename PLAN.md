# AI Scientist Lab Notebook — Delivery Plan (v0.1)
_Date: 2025-08-28 • Owner: PM/Tech Lead • Status: Draft_

## 0) One‑liner
**“Upload papers and datasets, ask questions like a scientist, and get faithful, cited answers—plus automatic experiment summaries and publication‑ready plots.”**

## 1) Goals & Non‑Goals (V1)
**Goals**
- Faithful, **cited** Q&A over uploaded PDFs and tables with inline page/figure/table references.
- Automatic **experiment summaries** with method, data, results, limitations, confidence.
- Plot builder over extracted or uploaded data (line/bar/scatter/box/violin; faceting); server‑rendered PNG/SVG + client preview.
- **Notebook exports** (PDF/Markdown/HTML; CSV/XLSX for tables; JSON bundle).
- **Guardrails**: “insufficient evidence” fallback; confidence & provenance surfaced; hallucination red‑teaming.
- Collaboration: multi‑workspace, role‑based access; audit log; shareable read‑only links.

**Non‑Goals (for V1)**
- General web search; only works over explicitly uploaded/linked sources.
- Unrestricted code execution; V1 ships **read‑only** parsing. (Sandbox exists but is **disabled** by default.)
- Full ELN replacement (chem inventory, scheduling, etc.).

## 2) Scope
### In‑scope (V1)
- Ingestion: PDF (academic layout aware), CSV/XLSX; ZIP metadata; arXiv/DOI fetch; dedup/versioning.
- Normalization: sectionizer, chunking with citation preservation; table typing & units (UCUM); entity tagging (tasks/datasets/metrics/models/etc.).
- Retrieval: **Hybrid** (BM25 + pgvector) with table‑aware retriever; **citations‑first** decoding; cross‑doc reasoning.
- Summaries: experiment span detection → structured summaries + confidence.
- Plots: transforms (filter/group/agg/pivot/melt/log/standardize), faceting, error bars/CI bands; PNG/SVG export; Python snippet.
- Views: paper viewer; retriever inspector; Answer panel w/ streaming & hover‑to‑highlight.
- Exports: report composer + notebook bundle (PDF/HTML/JSON); table exports (CSV/XLSX).
- Governance: RBAC, RLS, audit log, signed links, per‑workspace crypto keys.
- Observability: OTel, Prometheus/Grafana, Sentry.
- DevOps: Vercel FE; Render/Fly/GKE for APIs/workers; Managed Postgres + pgvector; Redis; NATS; S3/R2.

### Out‑of‑scope (V1)
- Offline desktop app; mobile native apps.
- Automated literature **discovery** beyond provided connectors.

## 3) Workstreams & Success Criteria
1. **Ingest & Index**
   - ✅ 20‑page PDF parse p95 < **18s**; Figures/Tables detected; Sections/Chunks linked; dedup by hash.
2. **RAG & QA**
   - ✅ First token < **2.0s** p95; full answer < **8s** p95; ≥ **1** citation per answer or “insufficient evidence” response.
3. **Experiment Summaries**
   - ✅ ≥ **90%** of detected experiments summarized with confidence ≥ **0.7**; links to figures/tables/sentences.
4. **Plotting**
   - ✅ 10^5 rows render < **2.5s** p95; PNG/SVG fidelity match; code snippet correctness.
5. **Reports/Exports**
   - ✅ Shareable read‑only links; bundle integrity (documents/chunks/tables/datasets/experiments/answers/citations/plots).
6. **Collaboration & Governance**
   - ✅ Workspaces, ACLs, audit log; expiring tokens; RLS verified by tests.
7. **Observability & SRE**
   - ✅ OTel spans across pipelines; Sentry noise budget respected; dashboards for key SLOs.

## 4) Milestones & Schedule (10 weeks)
- **Phase 1 – Foundations & Scaffolding (Sep 1–Sep 12, 2025)**
  - Repos, CI, IaC skeleton; Postgres + pgvector; Redis; NATS; S3/R2 buckets; RBAC (Casbin); Problem+JSON.
  - Next.js app shell; auth flows; Server Actions for signed uploads.
- **Phase 2 – Ingestion & Index (Sep 15–Sep 26)**
  - pdf‑worker (layout/figures/tables); table‑worker (typing/units); embed‑worker; chunk & link; index.upsert.
- **Phase 3 – RAG & QA (Sep 29–Oct 10)**
  - Hybrid retrieval; citations‑first planner; SSE streaming; retriever inspector.
- **Phase 4 – Summaries & Plotting (Oct 13–Oct 24)**
  - summary‑worker; confidence scoring; plot‑worker with transforms/faceting; server PNG/SVG; client preview.
- **Phase 5 – Reports, Exports & Governance (Oct 27–Nov 5)**
  - Report composer; bundle‑worker; shareable links; audit log; DSR endpoints.
- **Phase 6 – Hardening & Launch (Nov 6–Nov 8)**
  - Perf passes, red‑team tests, chaos drills, docs & runbooks; Beta go‑live.

> **Release gates** at end of Phases 3, 4, 5 with demo + metrics vs SLOs.

## 5) Deliverables
- Running environments: **dev**, **staging**, **prod** with blue/green deploys.
- OpenAPI 3.1 spec (/v1); TypeScript SDK (api‑client.ts); Postman collection.
- Migration files; seed fixtures; synthetic gold Q&A set.
- Playwright E2E + pipeline integration tests.
- SRE dashboards + alerting; runbooks; on‑call rotation start.

## 6) Team & Ownership
- PM (overall), Tech Lead (architecture), FE Lead (Next.js), BE Lead (NestJS), MLE (RAG/summaries), Data Eng (tables/units), SRE (infra/observability), QA (test strategy).
- Decision log (ADR) maintained in repo; DRI per epic.

## 7) Risks & Mitigations
| Risk | Impact | Mitigation |
|---|---|---|
| Complex PDF layouts degrade parsing | Medium | Use hybrid detectors; OCR fallback; flag low confidence for manual check |
| Citation leakage/hallucination | High | Citations‑first decoding; “insufficient evidence” default; red‑team evals |
| Vector db latency | Medium | HNSW + caching; pre‑computed rerankers; warm popular queries |
| Table units ambiguity | Medium | UCUM dictionaries; record conversions + formulae; human override UI |
| Cost spikes on batch embeds | Medium | Rate limits; batching; adaptive chunking; cold storage lifecycle |

## 8) Acceptance Criteria (Go/No‑Go)
- All Q&A responses have ≥1 citation or return “insufficient evidence” with guidance to add sources.
- SLOs met in staging for 72h burn‑in.
- Security review: RLS coverage; signed URLs; key management; audit completeness.
- Data exports verified reproducible (version capture).

## 9) Rollout
- Private beta (whitelisted orgs) → staged feature flags → public read‑only links.
- Error budgets & kill‑switch for workers; DLQ drain runbook.

---

**Appendix A — Environments**
- Dev: ephemeral branches; preview deploys.
- Staging: prod‑parity infra; smoke + load tests.
- Prod: regional pinning; PITR enabled; backup/restore drills.
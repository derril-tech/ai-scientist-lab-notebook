# AI Scientist Lab Notebook — TODO (V1, Phased)

> Owner tags: **[FE]**, **[BE]**, **[MLE]**, **[DE]**, **[SRE]**, **[QA]**, **[PM]**  
> Conventions: Use checklists; keep items atomic. PRs reference issue IDs.  
> Phases are grouped to balance workload; ~5 phases max.

---

## Phase 1: Foundations & Infrastructure
- [x] [PM][SRE] Create monorepo structure: `/frontend` (Next.js 14), `/api` (NestJS), `/workers` (Python), `/infra` (Terraform), `/docs`.
- [x] [SRE] GitHub Actions CI/CD: typecheck, lint, unit/integration tests, Docker build, image scan/sign, deploy (dev/staging).
- [x] [SRE] Configure secrets via KMS; environment matrices; OIDC to cloud provider.
- [x] [BE][SRE] Provision Postgres 16 + pgvector; enable extensions; roles & base RLS.
- [x] [BE] Apply schema migrations (orgs, users, workspaces, memberships, documents, chunks, figures, tables, datasets, experiments, qa_sessions, answers, citations, plots, audit_log).
- [x] [SRE] S3/R2 buckets: raw PDFs, artifacts (plots/bundles), public-cdn with signed URL policy.
- [x] [BE] Implement idempotency middleware (Request-ID ULID + Idempotency-Key).
- [x] [BE] Dedup/version lineage via hash.

---

## Phase 2: API Gateway & Event Bus
- [x] [BE] Scaffold NestJS API (/v1): OpenAPI 3.1, Zod validation, Problem+JSON.
- [x] [BE] Auth: `POST /auth/login`, `POST /auth/refresh`, `GET /me`, `GET /usage`.
- [x] [BE] Documents: `POST /documents` (signed upload → NATS `doc.ingest`), `POST /documents/:id/reparse`, `GET /documents/:id`, list w/ filters.
- [x] [BE] Datasets: `POST /datasets` (CSV/XLSX → `table.norm`), `GET /datasets/:id/preview?limit=100`.
- [x] [BE][MLE] QA: `POST /qa` (SSE stream), `GET /answers/:id`, `GET /answers/:id/citations`.
- [x] [BE][MLE] Summaries: `POST /summaries/:document_id/experiments`.
- [x] [BE][DE] Plots: `POST /plots`, `GET /plots/:id`.
- [x] [BE] Exports: `POST /bundles/notebook`, `GET /exports/tables.csv|xlsx?document_id=...`.
- [x] [BE] RBAC (Casbin) + RLS enforcement tests.
- [x] [BE] Rate limiting per org/IP; Idempotency-Key support.
- [x] [SRE] NATS subjects: `doc.ingest`, `doc.chunk`, `table.norm`, `index.upsert`, `qa.ask`, `sum.make`, `plot.make`, `bundle.make`; Redis Streams DLQ.
- [x] [BE] Worker base image; tracing; retry/backoff with jitter; idempotent handlers.

---

## Phase 3: Worker Pipelines (Ingest, Embed, RAG)
### pdf-worker
- [x] [MLE] Layout parse; figure/table detection; sectionizer; refs extraction; OCR fallback.
- [x] [MLE] Emit chunks with page ranges; link captions; push `doc.chunk`.
### table-worker
- [x] [DE] Header inference; units (UCUM); type inference (num/cat/date); schema JSON; record conversions.
- [x] [DE] PDF table extraction (ruling/stream modes + heuristics).
### embed-worker
- [x] [MLE] Text & table embeddings; batching & backpressure; upsert to pgvector; emit `index.upsert`.
### rag-worker
- [x] [MLE] Hybrid retriever (BM25 + vector + table-aware); reranker; citations-first planner.
- [x] [MLE] Answer generation with evidence gating; contradiction flags; SSE streaming.

---

## Phase 4: Worker Pipelines (Summaries, Plots, Bundles)
### summary-worker
- [x] [MLE] Experiment span detector; structured summary schema; confidence scoring; figure/table linker.
### plot-worker
- [x] [DE] Transforms (filter/group/agg/pivot/melt/log/standardize); faceting; error bars/CI bands.
- [x] [DE] Server-render PNG/SVG; store spec + artifacts; return IDs.
### bundle-worker
- [x] [BE] Notebook/report composer; JSON bundle (documents, chunks, tables, datasets, experiments, answers, citations, plots).
---

## Phase 5: Frontend, Observability, Security & QA
### Frontend (Next.js 14, React 18)
- [x] [FE] App routes: marketing, auth, notebook, documents, datasets, qa, summaries, plots, reports, settings.
- [x] [FE] State: TanStack Query + Zustand; SSE client; WS client.
- [x] [FE] Components: DocViewer, RetrieverInspector, AnswerPanel, ExperimentSummary, PlotBuilder, ReportComposer, UploadWizard.
- [x] [FE] Guardrails: disable Ask until ≥1 doc indexed; "insufficient evidence" UI.
- [x] [FE] Accessibility: keyboard nav, ARIA labels, captions for figures; high-contrast mode.
- [x] [FE] i18n: next-intl; localized number/date; unit labels.
### Observability & SRE
- [x] [SRE] OTel spans (`pdf.parse`, `table.norm`, `embed.upsert`, `rag.plan`, `rag.retrieve`, `rag.generate`, `sum.make`, `plot.render`).
- [x] [SRE] Prometheus/Grafana dashboards; Sentry integration.
- [x] [SRE] Synthetic probes for SSE; log correlation with Request-ID.
### Security & Governance
- [x] [BE] TLS/HSTS/CSP; strict MIME; CORS allowlist.
- [x] [BE] Signed URLs; KMS-wrapped tokens; per-workspace encryption keys.
- [x] [BE] RLS tests for all tables; tenancy fuzz tests.
- [x] [BE] Audit log on parses, edits, exports, prompts/responses.
- [x] [BE] DSR endpoints; retention windows; optional PII scrubbing.


## Phase 6: Testing
### Testing
- [x] [QA][MLE] Unit tests: sectionizer, header/units, entity tagger, unit conversions, chunk boundaries.
- [x] [QA][MLE] Retrieval: gold-labeled Q sets → recall@k; reranker A/B.
- [x] [QA][MLE] Generation: faithfulness (precision/recall), citation coverage, contradiction tests.
- [x] [QA] Summaries: completeness; evidence presence; confidence calibration.
- [x] [QA][DE] Plots: spec validation; transforms correctness; export fidelity.
- [x] [QA] Integration (pipeline): ingest → index → QA → summary → plot → bundle.
- [x] [QA] E2E (Playwright): upload PDF/CSV → auto-summaries → ask Q → hover citations → build plot → export report.
- [x] [SRE] Load: concurrent QA sessions; burst uploads; long-table previews.
- [x] [SRE] Chaos: OCR fallback, failed parses, delayed workers; retry/backoff UX signals.
- [x] [QA] Security: RLS coverage; signed URL scope; audit completeness.

## Phase 7: Documentation & Runbooks ✅
### Docs & Runbooks
- [x] [PM] README + architecture overview.
- [x] [SRE] Runbooks: DLQ drain, reparse workflow, restore, kill-switch.
- [x] [PM] ADRs for retriever choice, summarizer model, pgvector params.
## Definition of Done
- [x] Feature delivered with API spec + tests, FE states (loading/empty/error), metrics/tracking, docs, accessibility pass, SLO observed in staging, security review passed.
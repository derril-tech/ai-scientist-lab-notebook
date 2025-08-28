# AI Scientist Lab Notebook — Architecture (V1)

## 1) System Overview
**Frontend/BFF:** Next.js 14 on Vercel (SSR for viewers, ISR for public reports, Server Actions for signed uploads).  
**API Gateway:** NestJS (Node 20) exposing **/v1** REST (OpenAPI 3.1), Zod validation, Problem+JSON, RBAC (Casbin), Idempotency‑Key + Request‑ID (ULID).  
**Workers (Python 3.11 + FastAPI control):**
- **pdf‑worker** (layout parse, figure/table detect, sectionizer)
- **table‑worker** (normalize, header inference, UCUM units, typing)
- **embed‑worker** (text & table embeddings)
- **rag‑worker** (hybrid retrieval, answer planning/generation)
- **summary‑worker** (experiment summaries + confidence)
- **plot‑worker** (transforms + server renders → PNG/SVG)
- **bundle‑worker** (report/JSON bundle export)

**Event Bus/Queues:** NATS (`doc.ingest`, `doc.chunk`, `table.norm`, `index.upsert`, `qa.ask`, `sum.make`, `plot.make`, `bundle.make`) + Redis Streams DLQ.  
**Datastores:** Postgres 16 + **pgvector**, S3/R2 (artifacts), Redis (cache/session), optional DuckDB (ad‑hoc table ops), optional ClickHouse (usage analytics).  
**Observability:** OpenTelemetry + Prometheus/Grafana; Sentry errors.  
**Security:** TLS/HSTS/CSP, signed URLs, Cloud KMS, per‑workspace encryption keys, Postgres **RLS**; audit log.

### 1.1 High‑Level Diagram (ASCII)
```
[Next.js (Vercel)]
   |  (REST / SSE / WS)
   v
[NestJS API Gateway] <--> [Redis Cache]
   |  \          \ 
   |   \          \--> [S3/R2 Storage]
   |    \-> [NATS Bus] <=> [Workers: pdf | table | embed | rag | summary | plot | bundle]
   |               |
   v               v
[Postgres + pgvector]   [DuckDB (optional)]
```

## 2) Data Model (summary)
Relational core (Postgres 16):
- **Tenancy:** `orgs`, `users`, `workspaces`, `memberships` (RLS on `workspace_id`).
- **Documents:** `documents` (hash dedup, s3_key, meta JSONB), **immutable** versions (re‑parses create new rows).
- **Chunks:** `chunks(id, document_id, section, page_from, page_to, text, embedding VECTOR(1536), rank, meta)` with HNSW index.
- **Figures/Tables:** `figures`, `tables` (page, caption/title, bbox/schema/units).
- **Datasets:** uploaded CSV/XLSX; schema & rows_est; s3_key.
- **Experiments:** span JSON; summary JSON; confidence; links to evidence.
- **Q&A & Claims:** `qa_sessions`, `answers` (answer, confidence, reasoning JSON), `citations` (page/figure/table refs, snippet, score).
- **Plots:** spec JSON, artifact keys.
- **Audit:** `audit_log` for parses, edits, exports, prompts/responses.

**Invariants**
- RLS isolation; objects are append‑only; **all answers require ≥1 citation** or return “insufficient evidence”.
- Unit conversions captured with formulae; table schemas versioned; exports capture versions for reproducibility.

## 3) Key Flows

### 3.1 Ingest & Index
1. **Upload** → `POST /v1/documents` returns signed URL; FE Server Action uploads to S3.
2. API emits `doc.ingest` → **pdf‑worker** parses layout, detects sections/figures/tables, links captions → emits `doc.chunk`.
3. **embed‑worker** creates embeddings (text + table) → upserts to `chunks` (pgvector HNSW) → `index.upsert` for caches.
4. **table‑worker** normalizes PDF tables and CSV/XLSX uploads; infers headers/units/types; writes `tables`/`datasets` entries.

### 3.2 Ask & Cite (RAG)
1. User calls `POST /v1/qa` → API assigns `session_id`, streams SSE.
2. **rag‑worker** plans answer (**citations‑first**): selects evidence from hybrid retriever:
   - Lexical: BM25/FTS over `chunks.text` (approximate BM25 via weighted tsvector) + field boosts.
   - Vector: cosine over `chunks.embedding` (HNSW).
   - **Table‑aware**: structure‑matching on table schemas, numeric range filters, entity tags.
3. Rerank top‑k; detect contradictions; enforce **evidence gating**: generation only from selected evidence.
4. Stream tokens with incremental `partialCitations[]`; finalize with `{answer, citations[], confidence}`.

### 3.3 Experiment Auto‑Summaries
- **summary‑worker** detects method/result spans, composes structured JSON `{objective, setup, dataset, metrics, results, stats, limits, confounds}`; scores confidence (coverage/consistency/citation density); links to figures/tables/sentences.

### 3.4 Plotting
- **plot‑worker** resolves data source (extracted table or uploaded dataset), applies transforms (filter/group/agg/pivot/melt/log/standardize), renders PNG/SVG, stores spec/artifacts, returns IDs; FE shows interactive Recharts/Plotly preview; exports use server images.

### 3.5 Notebook Bundle & Reports
- **bundle‑worker** assembles documents/chunks/tables/datasets/experiments/answers/citations/plots into HTML/PDF/JSON; shareable read‑only link with expiring token.

## 4) API Surface (REST /v1)
- **Auth/Users:** `POST /auth/login`, `POST /auth/refresh`, `GET /me`, `GET /usage`
- **Documents & Datasets:** `POST /documents`, `POST /documents/:id/reparse`, `GET /documents/:id`, `GET /documents?query=`; `POST /datasets`; `GET /datasets/:id/preview`
- **RAG & Summaries:** `POST /qa` (SSE stream), `POST /summaries/:document_id/experiments`, `GET /answers/:id`, `GET /answers/:id/citations`
- **Plots:** `POST /plots`, `GET /plots/:id`
- **Exports:** `POST /bundles/notebook`, `GET /exports/tables.csv|xlsx`

**Conventions**
- Idempotency‑Key on mutations; Request‑ID header; Problem+JSON errors; cursor pagination; org/IP rate limits; SSE for long jobs.

## 5) Retrieval Details
- **Hybrid score** = α·BM25 + β·cosine + γ·table_score (tunable; A/B in staging).
- **Chunking**: layout‑aware; target 400–800 tokens; keep citation boundaries intact; figures/tables linked via page ranges + caption anchors.
- **Caching**: Redis caches for top‑k by question hash; invalidated on new ingests into the workspace.
- **Contradiction flags**: mark conflicting evidence; surface to UI; never synthesize beyond evidence.

## 6) Security & Compliance
- **Tenancy**: RLS on `workspace_id` for all tables. RBAC (Casbin) at API; doc‑level ACLs.
- **Secrets & Keys**: Cloud KMS; per‑workspace encryption keys for artifacts and tokens.
- **Links**: Signed URLs with scoped, short expiries; read‑only share tokens.
- **Audit**: Every parse, export, and model prompt/response logged with Request‑ID correlation.
- **DSR**: Export/delete APIs; optional PII scrubbing for datasets.
- **CSP**: strict; SSR pages avoid inline scripts; `nonce` for allowed inline as needed.

## 7) Observability & SLOs
- **OTel spans** across pipelines (`pdf.parse`, `table.norm`, `embed.upsert`, `rag.plan`, `rag.retrieve`, `rag.generate`, `sum.make`, `plot.render`).
- **Metrics**: parse latency, retrieval hit ratio, answer faithfulness score, citation coverage, plot render p95, SSE drop rate.
- **SLOs (V1)**: 20‑page parse p95 < 18s; QA first token < 2.0s; full answer < 8s; plot render (10^5 rows) < 2.5s; pipeline success ≥ 99%; SSE drop < 0.3%.

## 8) Performance & Scaling
- **pgvector**: HNSW, `vector_cosine_ops`, tuned `ef_search`/`m` per corpus size; periodic vacuum/analyze.
- **Lexical index**: `tsvector` with per‑section weights; prefix matching on terms common in methods/metrics.
- **Chunk adaptivity**: denser pages → smaller chunks; heuristic based on figure/table density.
- **Workers**: horizontal scale; NATS backpressure; DLQ with exponential backoff/jitter.
- **Hot caches**: outlines, dataset previews, popular questions pre‑warmed.

## 9) Accessibility & i18n
- Keyboard‑first navigation for PDF pages/evidence chips; ARIA labels; captions for figures; high‑contrast mode.
- `next-intl` locales; unit labels honoring locale formatting.

## 10) Optional Code‑Exec Sandbox (Disabled by Default)
- Isolated microservice; whitelisted libs; no network/filesystem access except ephemeral `/tmp`; time/memory limits.
- Outbound artifacts only through API with signed URLs.
- Feature flag to enable per workspace with additional safeguards.

## 11) Threat Model (summary)
- **Abuse**: oversize PDFs/CSVs → size/row limits + streaming parsing.
- **Poisoning**: malicious PDFs → sandboxed parsing, PDF sanitization, no JS in PDFs.
- **Data exfiltration**: strict ACLs, RLS, signed URLs, audit trails.
- **Prompt injection**: citations‑first decoding; evidence gating; instruction filters in generation layer.

## 12) Open Questions & ADRs
- BM25 implementation: Postgres FTS (tsvector/tsquery) vs external OpenSearch? (ADR‑001)
- Embedding model choice & dimensions (ADR‑002); cost/latency benchmarks.
- Confidence scoring method calibration set (ADR‑003).
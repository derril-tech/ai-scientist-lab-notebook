AI SCIENTIST LAB NOTEBOOK 

1) Product Description & Presentation 

One-liner 

“Upload papers and datasets, ask questions like a scientist, and get faithful, cited answers—plus automatic experiment summaries and publication-ready plots.” 

What it produces 

Cited Q&A over uploaded PDFs and tables (inline citations with page/figure/table refs). 

Auto-summaries of experiments (method, data, results, limitations, confidence). 

Graph plotting from extracted or uploaded data (line/bar/scatter/box/violin; faceting). 

Claims & evidence bundles (claim graph linking sentences ↔ figures/tables/sections). 

Notebook exports (PDF/Markdown/HTML, CSV/XLSX for extracted tables, JSON bundle). 

Scope/Safety 

Grounded, reference-linked answers only (no answer → “insufficient evidence” with prompts to add sources). 

Red-team checks for hallucinations; model outputs carry confidence + provenance. 

Read-only parsing by default; optional code-exec sandbox locked to whitelisted libs. 

 

2) Target User 

Researchers & grad students synthesizing literature quickly. 

R&D/data scientists pulling metrics from papers & combining with internal CSVs. 

Lab managers/PI maintaining group notebooks with consistent reporting. 

Regulatory/medical writers requiring strict citations and traceability. 

 

3) Features & Functionalities (Extensive) 

Ingestion & Connectors 

PDF ingestion (academic layout aware; section/figure/table detection; references). 

Table ingestion: CSV/XLSX; PDF table extraction (ruling/stream methods + heuristics). 

Supplementary data: ZIPs of datasets; arXiv/DOI fetch; PubMed metadata. 

Dedup & versioning: hash by content; version lineage for re-runs. 

Metadata enrichment: title/abstract/keywords/affiliations/DOI/venue/year. 

Normalization & Enrichment 

Sectionizer: split into Abstract/Intro/Methods/Results/Discussion/Conclusion/Refs. 

Chunking: layout-aware, citation-preserving; images/figure captions linked. 

Table normalizer: header inference, units detection (UCUM), column typing (num/cat/date). 

Entity tagging: tasks, datasets, metrics, models, species, chemicals (NER + ontology map). 

Units & conversions: normalize to canonical units; record conversion formulae. 

Retrieval & Reasoning (RAG) 

Hybrid retrieval: BM25 + dense (pgvector HNSW) + table-aware retriever. 

Citations-first decoding: answer plan forces evidence selection before generation. 

Cross-doc reasoning: join evidence across multiple papers; contradiction flags. 

Retriever inspector: shows the top-k chunks/tables with scores & why-picked. 

Experiment Auto-Summaries 

Detector for experiment spans (method/result clusters). 

Structured summary: {objective, setup, dataset, metrics, results, stats, limits, confounds}. 

Figure/table linker: each claim must anchor to at least one figure/table/sentence. 

Confidence scoring: coverage, consistency, and citation density. 

Graph Plotting & Analysis 

Plot builder: select table/columns → suggest plot types → render (line/bar/scatter/box/violin, error bars, CI bands). 

Faceting/grouping: by categorical columns; small multiples. 

Transformations: filter, group, aggregate, pivot/melt, log/standardize. 

Exports: PNG/SVG, code snippet (Python/Matplotlib + pandas) for repro. 

Views & Reporting 

Paper viewer with synchronized outline, highlights, figures, tables. 

Notebook timeline of Q&A, summaries, plots; pin to “Findings.” 

Claim graph view (claims ↔ evidence nodes). 

Report composer: drag claims/plots into a templated report. 

Rules & Automations 

Auto-summarize on ingest; auto-plot top metrics per paper. 

IFTTT: “When metric ‘AUROC’ appears across ≥3 papers, build comparison chart.” 

Scheduled digests: weekly summary of new findings in a topic. 

Collaboration & Governance 

Workspaces (Owner/Admin/Member/Viewer); doc-level ACLs. 

Shareable read-only links (with expiring tokens). 

Audit log of parses, edits, exports, and model prompts/responses. 

 

4) Backend Architecture (Extremely Detailed & Deployment-Ready) 

4.1 Topology 

Frontend/BFF: Next.js 14 (Vercel). Server Actions for signed uploads, SSR for viewers, ISR for public read-only reports. 

API Gateway: NestJS (Node 20) — REST /v1 (OpenAPI 3.1), Zod validation, Problem+JSON, RBAC (Casbin), RLS, Idempotency-Key, Request-ID (ULID). 

Python workers (3.11 + FastAPI control) 

pdf-worker (layout parse, figure/table detect) 

table-worker (normalize, type & unit inference) 

embed-worker (text & table embeddings) 

rag-worker (retrieval, answer planning, generation) 

summary-worker (experiment summaries & confidence) 

plot-worker (dataset transforms + static plot renders, PNG/SVG) 

bundle-worker (report/JSON bundle export) 

Event bus/queues: NATS (subjects: doc.ingest, doc.chunk, table.norm, index.upsert, qa.ask, sum.make, plot.make, bundle.make) + Redis Streams; Celery/RQ orchestration. 

Datastores: 

Postgres 16 + pgvector (text/table embeddings, metadata) 

S3/R2 (PDFs, plots, JSON bundles) 

Redis (cache/session) 

Optional: DuckDB (ad-hoc analytics on uploaded tables); ClickHouse for large usage analytics 

Observability: OpenTelemetry + Prometheus/Grafana; Sentry for error tracking. 

Secrets: Cloud KMS; per-workspace encryption keys. 

4.2 Data Model (Postgres + pgvector + optional DuckDB) 

-- Tenancy & Identity 
CREATE TABLE orgs (id UUID PRIMARY KEY, name TEXT NOT NULL, plan TEXT DEFAULT 'free', created_at TIMESTAMPTZ DEFAULT now()); 
CREATE TABLE users (id UUID PRIMARY KEY, org_id UUID REFERENCES orgs(id) ON DELETE CASCADE, 
  email CITEXT UNIQUE NOT NULL, name TEXT, role TEXT DEFAULT 'member', tz TEXT, created_at TIMESTAMPTZ DEFAULT now()); 
CREATE TABLE workspaces (id UUID PRIMARY KEY, org_id UUID, name TEXT, created_by UUID, created_at TIMESTAMPTZ DEFAULT now()); 
CREATE TABLE memberships (user_id UUID, workspace_id UUID, role TEXT CHECK (role IN ('owner','admin','member','viewer')), 
  PRIMARY KEY(user_id, workspace_id)); 
 
-- Documents 
CREATE TABLE documents (id UUID PRIMARY KEY, workspace_id UUID, title TEXT, doi TEXT, source TEXT, 
  year INT, venue TEXT, hash TEXT UNIQUE, s3_key TEXT, status TEXT, meta JSONB, created_at TIMESTAMPTZ DEFAULT now()); 
 
-- Sections/Chunks (vector index) 
CREATE TABLE chunks (id UUID PRIMARY KEY, document_id UUID, section TEXT, page_from INT, page_to INT, 
  text TEXT, embedding VECTOR(1536), rank INT, meta JSONB); 
CREATE INDEX ON chunks USING hnsw (embedding vector_cosine_ops); 
 
-- Figures & Tables 
CREATE TABLE figures (id UUID PRIMARY KEY, document_id UUID, page INT, caption TEXT, bbox JSONB, s3_key TEXT, meta JSONB); 
CREATE TABLE tables (id UUID PRIMARY KEY, document_id UUID, page INT, title TEXT, schema JSONB, units JSONB, meta JSONB); 
 
-- Uploaded Datasets (CSV/XLSX) 
CREATE TABLE datasets (id UUID PRIMARY KEY, workspace_id UUID, name TEXT, schema JSONB, rows_est BIGINT, 
  s3_key TEXT, meta JSONB, created_at TIMESTAMPTZ DEFAULT now()); 
 
-- Experiment Summaries 
CREATE TABLE experiments (id UUID PRIMARY KEY, document_id UUID, span JSONB, summary JSONB, 
  confidence NUMERIC, links JSONB, created_at TIMESTAMPTZ DEFAULT now()); 
 
-- Q&A + Claims 
CREATE TABLE qa_sessions (id UUID PRIMARY KEY, workspace_id UUID, question TEXT, created_by UUID, created_at TIMESTAMPTZ DEFAULT now()); 
CREATE TABLE answers (id UUID PRIMARY KEY, session_id UUID, answer TEXT, confidence NUMERIC, reasoning JSONB, created_at TIMESTAMPTZ DEFAULT now()); 
CREATE TABLE citations (id UUID PRIMARY KEY, answer_id UUID, document_id UUID, kind TEXT, ref JSONB, -- page/figure/table 
  snippet TEXT, score NUMERIC); 
 
-- Plots 
CREATE TABLE plots (id UUID PRIMARY KEY, workspace_id UUID, spec JSONB, s3_key_png TEXT, s3_key_svg TEXT, created_by UUID, created_at TIMESTAMPTZ DEFAULT now()); 
 
-- Audit 
CREATE TABLE audit_log (id BIGSERIAL PRIMARY KEY, org_id UUID, user_id UUID, action TEXT, target TEXT, meta JSONB, created_at TIMESTAMPTZ DEFAULT now()); 
  

Invariants 

RLS on workspace_id; objects immutable except re-parses create new versions. 

All answers require ≥1 citation or return “insufficient evidence.” 

Unit conversions recorded; table schemas versioned; reproducible exports capture versions. 

4.3 API Surface (REST /v1, OpenAPI 3.1) 

Auth/Orgs/Users 

POST /auth/login, POST /auth/refresh, GET /me, GET /usage 

Documents & Datasets 

POST /documents (signed upload) → doc.ingest 

POST /documents/:id/reparse (force re-ingest) 

GET /documents/:id, GET /documents?query=... 

POST /datasets (CSV/XLSX) → table.norm 

GET /datasets/:id/preview?limit=100 

RAG & Summaries 

POST /qa {question, workspace_id, filters?} → stream SSE with citations 

POST /summaries/:document_id/experiments → list/generate summaries 

GET /answers/:id, GET /answers/:id/citations 

Plots 

POST /plots {dataset_id|table_ref, x, y, series?, agg?, kind, transforms?} → PNG/SVG + spec 

GET /plots/:id 

Exports 

POST /bundles/notebook {workspace_id, range} → signed URL (PDF/HTML/JSON) 

GET /exports/tables.csv|xlsx?document_id=... 

Conventions 

Idempotency-Key on mutations; Problem+JSON; cursor pagination; rate limits per org/IP; SSE for long-running ops. 

4.4 Pipelines & Workers 

Ingest 

Receive PDF → layout parse → detect sections/figures/tables → chunk & caption link → push index.upsert. 

Index 

 2) Embed chunks/tables → upsert to pgvector → build hybrid indexes → warm caches. 

Summarize 

 3) Detect experiment spans → produce structured summaries → score confidence → link evidence. 

RAG 

 4) For each question: planner selects evidence → hybrid retrieve (text+tables) → grounded generation → citations attached → stream tokens via SSE. 

Plot 

 5) Resolve data source (dataset or extracted table) → apply transforms → render plot → store spec + PNG/SVG. 

Bundle 

 6) Compose notebook/report → package artifacts → upload to S3 → return signed URL. 

4.5 Realtime 

WebSockets: ws:workspace:{id}:status (ingest/index progress), qa:{session_id}:events. 

SSE: streaming tokens for QA; background job progress events. 

4.6 Caching & Performance 

Redis caches for top-k retrieval results, doc outlines, dataset previews. 

pgvector HNSW + BM25 hybrid; precomputed rerankers for popular questions. 

Chunk sizes adaptive to layout density; table previews paginated; DuckDB for local joins. 

4.7 Observability 

OTel spans: pdf.parse, table.norm, embed.upsert, rag.plan, rag.retrieve, rag.generate, sum.make, plot.render. 

Metrics: parse latency, retrieval hit ratio, answer faithfulness score, summary coverage, plot render p95. 

Sentry: parse failures, OCR fallbacks, empty evidence warnings. 

4.8 Security & Compliance 

TLS/HSTS/CSP; signed URLs; per-workspace encryption keys; KMS-wrapped tokens. 

RLS tenant isolation; audit trail; DSR endpoints; export/delete APIs. 

Optional PII scrubbing (names/emails) for datasets; configurable retention windows. 

 

5) Frontend Architecture (React 18 + Next.js 14) 

5.1 Tech Choices 

UI: PrimeReact (DataTable, Dialog, Sidebar, FileUpload, Chart* wrapper) + Tailwind for layout. 

Charts: Recharts or Plotly.js (client) for interactive; server-rendered PNGs for exports. 

State/Data: TanStack Query; Zustand for UI panels; URL-synced filters. 

Realtime: WS client + SSE. 

i18n/A11y: next-intl; keyboard-first, captions for figures, ARIA labels. 

5.2 App Structure 

/app 
  /(marketing)/page.tsx 
  /(auth)/sign-in/page.tsx 
  /(app)/notebook/page.tsx 
  /(app)/documents/page.tsx 
  /(app)/datasets/page.tsx 
  /(app)/qa/page.tsx 
  /(app)/summaries/page.tsx 
  /(app)/plots/page.tsx 
  /(app)/reports/page.tsx 
  /(app)/settings/page.tsx 
/components 
  DocViewer/*           // PDF w/ outline, highlights, figure/table panels 
  TablePreview/*        // Schema + 100-row preview, typing, units 
  RetrieverInspector/*  // Top-k evidence with scores 
  AnswerPanel/*         // Streaming answer + pinned citations 
  ExperimentSummary/*   // Structured cards + confidence 
  PlotBuilder/*         // Column pickers, transforms, live chart 
  ReportComposer/*      // Drag claims/plots into sections 
  UploadWizard/*        // PDF/CSV/XLSX ingest 
/lib 
  api-client.ts 
  sse-client.ts 
  zod-schemas.ts 
  rbac.ts 
/store 
  useNotebookStore.ts 
  useQAStore.ts 
  usePlotStore.ts 
  useUploadStore.ts 
  

5.3 Key Pages & UX Flows 

Onboarding: upload PDFs/datasets → auto-summaries generated → guided tour to ask first question & build first plot. 

Documents: split view (PDF ↔ outline/figures/tables). Click a figure/table → jump to page, view extracted data. 

Q&A: ask question → stream answer; hover citation → highlight evidence in viewer; “why this?” shows retriever inspector. 

Summaries: experiment cards; expand to see evidence; one-click add to report. 

Plots: choose data source → pick x/y/series/agg → preview → export PNG/SVG or copy Python code. 

Reports: drag claims/plots; export PDF/HTML/Markdown; share read-only link. 

5.4 Component Breakdown (Selected) 

AnswerPanel/Stream.tsx 

 Props: { sessionId } — SSE streaming; accumulates tokens; renders citation chips; copy & pin. 

RetrieverInspector/List.tsx 

 Props: { items } — shows chunk/table, score, section/page; click to open in DocViewer. 

PlotBuilder/Editor.tsx 

 Props: { dataset, schema } — column pickers, transforms (filter/group/agg/pivot), live chart. 

5.5 Data Fetching & Caching 

Server components for document lists, report pages; client queries for QA streams & plot previews. 

TanStack Query with background refresh; optimistic plot spec updates; WS updates for parse progress. 

5.6 Validation & Error Handling 

Zod schema validation; Problem+JSON renderer with remediation (bad table types, parse failures). 

Guardrails: answer button disabled until ≥1 document indexed; “insufficient evidence” state rendered clearly. 

5.7 Accessibility & i18n 

Keyboard navigation across PDF pages and evidence chips; high-contrast mode; alternate text for figures; localized number/date formats; unit labels. 

 

6) SDKs & Integration Contracts 

Ask a question 

POST /v1/qa 
{ 
  "workspace_id": "UUID", 
  "question": "What dataset size and AUROC were reported for model X?", 
  "filters": {"year_gte": 2020, "venue_in": ["NeurIPS","Nature"]} 
} 
  

Response (SSE stream): tokens with {text, partialCitations[]}; final frame includes {answer, citations[], confidence}. 

Generate experiment summaries 

POST /v1/summaries/{document_id}/experiments 
  

Create a plot 

POST /v1/plots 
{ 
  "dataset_id": "UUID", 
  "x": "epoch", 
  "y": "accuracy", 
  "series": "model", 
  "kind": "line", 
  "transforms": [{"type":"groupby","by":["model"]},{"type":"agg","op":"mean"}] 
} 
  

Notebook bundle 

POST /v1/bundles/notebook { "workspace_id": "UUID", "range": {"from":"2025-08-01","to":"2025-08-31"} } 
  

JSON bundle keys: documents[], chunks[], tables[], datasets[], experiments[], answers[], citations[], plots[]. 

 

7) DevOps & Deployment 

FE: Vercel (Next.js). 

APIs/Workers: Render/Fly/GKE; worker pools (pdf, table, embed, rag, summary, plot, bundle). 

DB: Managed Postgres + pgvector; PITR; read replicas. 

Cache/Bus: Redis + NATS; DLQ with exponential backoff/jitter. 

Storage: S3/R2 with lifecycle (original PDFs, plot images, bundles). 

CI/CD: GitHub Actions (typecheck/lint/unit/integration, Docker build, image scan, sign, deploy); blue/green; migration approvals. 

IaC: Terraform modules for DB/Redis/NATS/buckets/CDN/secrets/DNS. 

Envs: dev/staging/prod; region pinning; error budgets & alerts. 

Operational SLOs 

PDF ingest (20-page) parse < 18 s p95. 

QA first token < 2.0 s p95; full answer < 8 s p95 with citations. 

Plot render (10^5 rows) < 2.5 s p95. 

 

8) Testing 

Unit: sectionizer accuracy; table header/units inference; entity tagger; unit conversions; chunking boundaries. 

Retrieval: gold-labeled question sets → top-k recall@k; reranker A/B. 

Generation: faithfulness (nugget precision/recall), citation coverage, contradiction tests. 

Summaries: structure completeness; evidence presence; confidence calibration. 

Plots: spec validation, transforms correctness, export fidelity. 

Integration (pipeline): ingest → index → QA → summary → plot → bundle. 

E2E (Playwright): upload PDF/CSV → verify auto-summaries → ask Q → hover citations → build plot → export report. 

Load: concurrent QA sessions; burst uploads; long-table previews. 

Chaos: OCR fallback, failed parses, delayed workers; ensure retries/backoff with user prompts. 

Security: RLS coverage; signed URL scope; audit completeness. 

 

9) Success Criteria 

Product KPIs 

Answer faithfulness (human-rated) ≥ 0.85; “insufficient evidence” used appropriately ≥ 95th percentile compliance. 

Citation coverage: ≥ 1.8 citations per answer on average. 

Summary coverage: ≥ 90% of detected experiments summarized with confidence ≥ 0.7. 

Time to first insight (upload → first cited answer): < 5 minutes median. 

Weekly active researchers (WAU/MAU): ≥ 55% after 4 weeks. 

Engineering SLOs 

Pipeline success (ex-OCR) ≥ 99%; QA SSE drop rate < 0.3%; plot export p95 < 3 s. 

 

10) Visual/Logical Flows 

A) Ingest & Index 

 Upload PDF/CSV → parse layout & tables → chunk + embed → upsert indexes → caches warmed. 

B) Ask & Cite 

 User asks Q → planner selects evidence → hybrid retrieve (text+tables) → grounded generation → stream answer with citations → user hovers to view highlighted evidence. 

C) Summarize Experiments 

 Detector finds method/result spans → structured summary with links to figures/tables/sentences → confidence → user pins to notebook/report. 

D) Plot & Export 

 Select dataset/table → choose x/y/series + transforms → render plot → export PNG/SVG or copy Python code → add to report → export PDF/HTML/JSON bundle. 

 

 
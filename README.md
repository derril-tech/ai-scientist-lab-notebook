# AI Scientist Lab Notebook

An AI-powered lab notebook for scientific research with intelligent document processing, question answering, experiment summaries, and data visualization.

## 🎯 What is AI Scientist Lab Notebook?

**AI Scientist Lab Notebook** is a comprehensive, AI-powered research management platform designed specifically for scientists, researchers, and academic institutions. It transforms traditional lab notebooks into intelligent, interactive research environments that leverage cutting-edge artificial intelligence to enhance scientific discovery and collaboration.

## 🔬 What does the product do?

### Core Capabilities

**📄 Intelligent Document Processing**
- Automatically extracts text, tables, figures, and references from PDF research papers
- Performs advanced layout analysis and OCR for complex scientific documents
- Identifies and categorizes scientific content (methods, results, discussions, etc.)
- Maintains document versioning and lineage tracking

**🤖 AI-Powered Question Answering**
- Ask natural language questions about your research documents
- Receive AI-generated answers with precise citations and evidence
- Hybrid retrieval system combining vector search, BM25, and table-aware retrieval
- Real-time streaming responses with confidence scoring

**🧪 Experiment Detection & Summarization**
- Automatically identifies experiments within research papers
- Generates structured summaries with key findings, methods, and results
- Extracts experimental parameters, outcomes, and statistical significance
- Links experiments to relevant figures, tables, and citations

**📊 Advanced Data Visualization**
- Create interactive plots and charts from extracted data
- Support for multiple chart types (bar, line, scatter, heatmap, etc.)
- Statistical analysis and trend detection
- Export visualizations in multiple formats (PNG, SVG, PDF)

**📚 Comprehensive Notebook Bundles**
- Generate complete research reports combining documents, data, and insights
- Export in multiple formats (PDF, HTML, Markdown)
- Include all supporting evidence, citations, and visualizations
- Maintain research provenance and traceability

**🔐 Enterprise-Grade Security**
- Multi-tenant architecture with workspace isolation
- Role-based access control (RBAC) with fine-grained permissions
- Complete audit logging for compliance and security
- GDPR compliance with data subject rights (DSR) endpoints

## 💡 Benefits of the Product

### For Individual Researchers
- **⏰ Time Savings**: Reduce hours spent manually extracting data and creating summaries
- **🔍 Enhanced Discovery**: Find relevant information across large document collections instantly
- **📈 Better Insights**: AI-powered analysis reveals patterns and connections you might miss
- **📝 Improved Documentation**: Automated experiment tracking and structured summaries
- **🔄 Reproducibility**: Maintain complete research provenance and data lineage

### For Research Teams
- **🤝 Enhanced Collaboration**: Shared workspaces with real-time updates and comments
- **📊 Centralized Knowledge**: Single source of truth for all research documents and findings
- **🔗 Cross-Reference Discovery**: AI identifies connections between different experiments and papers
- **📋 Standardized Processes**: Consistent documentation and reporting across team members
- **🚀 Accelerated Research**: Faster literature reviews and experimental analysis

### For Academic Institutions
- **🎓 Educational Value**: Teach students modern research methodologies and tools
- **📚 Knowledge Management**: Preserve institutional research knowledge and expertise
- **🔬 Research Excellence**: Enable more thorough and comprehensive research practices
- **💼 Grant Compliance**: Maintain detailed records for funding and compliance requirements
- **🌍 Global Collaboration**: Support international research partnerships and data sharing

### For Industry R&D
- **💰 Cost Reduction**: Reduce manual data processing and analysis costs
- **⚡ Faster Innovation**: Accelerate research cycles and time-to-market
- **🔒 IP Protection**: Secure handling of proprietary research and confidential data
- **📊 Competitive Intelligence**: Better understanding of research landscape and trends
- **🎯 Strategic Insights**: Data-driven decision making for R&D investments

### Technical Benefits
- **🛡️ Enterprise Security**: Production-ready with comprehensive security features
- **📈 Scalability**: Handles large document collections and concurrent users
- **🔧 Extensibility**: Modular architecture supports custom integrations and workflows
- **📊 Observability**: Complete monitoring and analytics for system performance
- **🌐 Modern Stack**: Built with cutting-edge technologies for reliability and performance

## 🚀 Features

- **Document Processing**: Upload PDFs and automatically extract text, tables, figures, and references
- **Intelligent Q&A**: Ask questions about your documents and get AI-powered answers with citations
- **Experiment Summaries**: Automatically detect and summarize experiments from research papers
- **Data Visualization**: Create interactive plots and charts from your datasets
- **Notebook Bundles**: Export comprehensive reports combining documents, data, and insights
- **Multi-tenant**: Secure workspace-based organization with role-based access control

## 🏗️ Architecture

### System Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   API Gateway   │    │   Workers       │
│   (Next.js 14)  │◄──►│   (NestJS)      │◄──►│   (Python)      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   S3/R2         │    │   PostgreSQL    │    │   NATS + Redis  │
│   Storage       │    │   + pgvector    │    │   Event Bus     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Core Components

#### Frontend (Next.js 14)
- **Framework**: Next.js 14 with App Router
- **State Management**: TanStack Query + Zustand
- **UI**: Tailwind CSS + Heroicons
- **Real-time**: Server-Sent Events (SSE) for streaming responses

#### API Gateway (NestJS)
- **Framework**: NestJS with TypeScript
- **Authentication**: JWT with refresh tokens
- **Validation**: Zod schemas
- **Documentation**: OpenAPI 3.1
- **Security**: RBAC with Casbin, Row Level Security (RLS)

#### Workers (Python + FastAPI)
- **pdf-worker**: PDF parsing, layout analysis, OCR
- **table-worker**: Table normalization, schema inference
- **embed-worker**: Text and table embeddings
- **rag-worker**: Question answering with hybrid retrieval
- **summary-worker**: Experiment detection and summarization
- **plot-worker**: Data visualization and chart generation
- **bundle-worker**: Report composition and export

#### Infrastructure
- **Database**: PostgreSQL 16 with pgvector extension
- **Event Bus**: NATS with Redis Streams for dead letter queues
- **Storage**: S3-compatible storage (AWS S3 or Cloudflare R2)
- **Monitoring**: OpenTelemetry, Prometheus, Grafana
- **Security**: KMS for secrets, signed URLs, audit logging

## 🛠️ Setup

### Prerequisites

- Node.js 20+
- Python 3.11+
- Docker and Docker Compose
- PostgreSQL 16 with pgvector extension
- NATS server
- Redis server

### Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-org/ai-scientist-lab-notebook.git
   cd ai-scientist-lab-notebook
   ```

2. **Install dependencies**
   ```bash
   # Install root dependencies
   npm install
   
   # Install frontend dependencies
   cd frontend && npm install
   
   # Install API dependencies
   cd ../api && npm install
   
   # Install worker dependencies
   cd ../workers && pip install -r requirements.txt
   ```

3. **Environment setup**
   ```bash
   # Copy environment files
   cp .env.example .env
   cp frontend/.env.example frontend/.env.local
   cp api/.env.example api/.env
   cp workers/.env.example workers/.env
   ```

4. **Database setup**
   ```bash
   # Run database migrations
   cd api && npm run migration:run
   ```

5. **Start services**
   ```bash
   # Start all services with Docker Compose
   docker-compose up -d
   
   # Or start individually
   npm run dev:frontend  # Frontend on http://localhost:3000
   npm run dev:api      # API on http://localhost:3001
   npm run dev:workers  # Workers on http://localhost:8000
   ```

### Development

#### Frontend Development
```bash
cd frontend
npm run dev          # Start development server
npm run build        # Build for production
npm run test         # Run tests
npm run lint         # Run linter
```

#### API Development
```bash
cd api
npm run start:dev    # Start development server
npm run build        # Build for production
npm run test         # Run tests
npm run migration:run # Run database migrations
```

#### Workers Development
```bash
cd workers
uvicorn src.main:app --reload --port 8000  # Start development server
pytest tests/        # Run tests
```

## 📚 Usage

### 1. Upload Documents

Upload PDF research papers through the web interface or API:

```bash
curl -X POST http://localhost:3001/v1/documents \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@research_paper.pdf"
```

### 2. Ask Questions

Ask questions about your documents:

```bash
curl -X POST http://localhost:3001/v1/qa \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "question": "What are the main findings of this study?",
    "document_ids": ["doc-123"]
  }'
```

### 3. Generate Plots

Create visualizations from your data:

```bash
curl -X POST http://localhost:3001/v1/plots \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Performance Comparison",
    "plot_type": "bar",
    "data_source": "dataset-456",
    "x_column": "condition",
    "y_column": "performance"
  }'
```

### 4. Export Reports

Generate comprehensive notebook bundles:

```bash
curl -X POST http://localhost:3001/v1/bundles/notebook \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Research Summary",
    "document_ids": ["doc-123"],
    "experiment_ids": ["exp-789"],
    "plot_ids": ["plot-101"]
  }'
```

## 🔧 Configuration

### Environment Variables

#### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:3001/v1
NEXT_PUBLIC_WS_URL=ws://localhost:3001
```

#### API (.env)
```env
DATABASE_URL=postgresql://user:pass@localhost:5432/ai_lab_notebook
JWT_SECRET=your-jwt-secret
NATS_URL=nats://localhost:4222
REDIS_URL=redis://localhost:6379
S3_BUCKET=ai-lab-notebook-storage
```

#### Workers (.env)
```env
DATABASE_URL=postgresql://user:pass@localhost:5432/ai_lab_notebook
NATS_URL=nats://localhost:4222
REDIS_URL=redis://localhost:6379
OPENAI_API_KEY=your-openai-key
```

### Database Schema

The system uses PostgreSQL with the following key tables:

- `organizations` - Multi-tenant organizations
- `users` - User accounts with workspace memberships
- `documents` - Uploaded PDF documents
- `chunks` - Text chunks with embeddings
- `tables` - Extracted tables with schemas
- `experiments` - Detected experiment summaries
- `qa_sessions` - Q&A conversation sessions
- `answers` - Generated answers with citations
- `plots` - Generated visualizations
- `audit_log` - Security audit trail

## 🧪 Testing

### Running Tests

```bash
# Frontend tests
cd frontend && npm run test

# API tests
cd api && npm run test

# Worker tests
cd workers && pytest tests/

# E2E tests
npm run test:e2e
```

### Test Coverage

- **Unit Tests**: Core business logic and utilities
- **Integration Tests**: API endpoints and worker pipelines
- **E2E Tests**: Complete user workflows
- **Load Tests**: Performance under concurrent load
- **Security Tests**: RBAC, RLS, and audit logging

## 📊 Monitoring

### Metrics

- **Application Metrics**: Request rates, response times, error rates
- **Worker Metrics**: Processing times, queue depths, failure rates
- **Database Metrics**: Query performance, connection pools
- **Infrastructure Metrics**: CPU, memory, disk usage

### Dashboards

- **Grafana**: Real-time monitoring dashboards
- **Sentry**: Error tracking and performance monitoring
- **Custom Dashboards**: Business metrics and user analytics

## 🔒 Security

### Authentication & Authorization

- **JWT Tokens**: Secure token-based authentication
- **RBAC**: Role-based access control with Casbin
- **RLS**: Row-level security for data isolation
- **Audit Logging**: Complete audit trail of all actions

### Data Protection

- **Encryption**: Data encrypted at rest and in transit
- **Signed URLs**: Secure file access with time-limited URLs
- **KMS Integration**: Secure key management
- **PII Handling**: Optional PII scrubbing and retention policies

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow conventional commits
- Write tests for new features
- Update documentation
- Ensure accessibility compliance
- Run security scans

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: [docs/](docs/)
- **Issues**: [GitHub Issues](https://github.com/your-org/ai-scientist-lab-notebook/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-org/ai-scientist-lab-notebook/discussions)

## 🗺️ Roadmap

- [ ] Multi-language support
- [ ] Advanced visualization types
- [ ] Collaborative editing
- [ ] Mobile app
- [ ] API rate limiting improvements
- [ ] Advanced search capabilities
- [ ] Integration with external data sources

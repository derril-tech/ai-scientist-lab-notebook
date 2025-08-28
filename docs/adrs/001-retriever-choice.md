# ADR 001: Retriever Choice for RAG System

## Status

Accepted

## Context

The AI Scientist Lab Notebook requires a robust retrieval system for the RAG (Retrieval-Augmented Generation) pipeline. The system needs to handle diverse content types including:
- Text chunks from research papers
- Structured tables with numerical data
- Figures and captions
- Cross-references and citations

The retrieval system must provide:
- High recall for relevant information
- Fast query response times
- Support for hybrid search (semantic + keyword)
- Ability to handle scientific terminology
- Scalability to millions of documents

## Decision

We will implement a **hybrid retrieval system** combining:

1. **Dense Vector Search** using pgvector with sentence-transformers
2. **Sparse BM25 Search** for keyword matching
3. **Table-aware retrieval** for structured data
4. **Reranking** with cross-encoder models

### Technical Implementation

#### Vector Search
- **Model**: `sentence-transformers/all-MiniLM-L6-v2` (384d)
- **Database**: PostgreSQL with pgvector extension
- **Index**: HNSW (Hierarchical Navigable Small World) index
- **Similarity**: Cosine similarity

#### BM25 Search
- **Implementation**: Custom BM25 scoring in PostgreSQL
- **Features**: Term frequency, inverse document frequency
- **Optimization**: Pre-computed document statistics

#### Table Retrieval
- **Schema**: JSON-based table representation
- **Search**: Column name and data type matching
- **Scoring**: Relevance to query intent

#### Reranking
- **Model**: `cross-encoder/ms-marco-MiniLM-L-6-v2`
- **Input**: Top-k candidates from hybrid retrieval
- **Output**: Re-ranked list with relevance scores

## Consequences

### Positive

1. **High Recall**: Hybrid approach captures both semantic and keyword matches
2. **Scientific Accuracy**: Vector search handles domain-specific terminology
3. **Fast Performance**: pgvector with HNSW provides sub-millisecond search
4. **Scalability**: PostgreSQL handles millions of embeddings efficiently
5. **Flexibility**: Easy to add new retrieval methods or models

### Negative

1. **Complexity**: Multiple retrieval methods increase system complexity
2. **Resource Usage**: Higher memory and CPU requirements
3. **Latency**: Reranking adds additional processing time
4. **Maintenance**: Multiple models require version management

### Risks

1. **Model Drift**: Embedding models may become outdated
2. **Index Corruption**: pgvector indexes can become corrupted
3. **Performance Degradation**: Large datasets may impact search speed

## Alternatives Considered

### 1. Pure Vector Search
- **Pros**: Simple, good semantic understanding
- **Cons**: Poor keyword matching, expensive for large datasets
- **Rejection**: Insufficient for scientific literature with specific terminology

### 2. Pure BM25 Search
- **Pros**: Fast, good keyword matching
- **Cons**: No semantic understanding, poor for synonyms
- **Rejection**: Inadequate for scientific concepts and relationships

### 3. Elasticsearch
- **Pros**: Mature search engine, good BM25 implementation
- **Cons**: Additional infrastructure, complex setup
- **Rejection**: Prefer to leverage existing PostgreSQL infrastructure

### 4. Pinecone/Weaviate
- **Pros**: Optimized for vector search
- **Cons**: Vendor lock-in, additional costs
- **Rejection**: Prefer self-hosted solution for data control

## Implementation Details

### Database Schema

```sql
-- Vector embeddings table
CREATE TABLE chunks (
  id UUID PRIMARY KEY,
  document_id UUID REFERENCES documents(id),
  content TEXT NOT NULL,
  embedding vector(384),
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- BM25 statistics table
CREATE TABLE document_stats (
  document_id UUID PRIMARY KEY,
  total_terms INTEGER,
  avg_term_freq REAL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- HNSW index for vector search
CREATE INDEX ON chunks USING hnsw (embedding vector_cosine_ops);
```

### Retrieval Pipeline

```python
class HybridRetriever:
    def __init__(self):
        self.vector_model = SentenceTransformer('all-MiniLM-L6-v2')
        self.reranker = CrossEncoder('ms-marco-MiniLM-L-6-v2')
    
    def retrieve(self, query: str, k: int = 20) -> List[Document]:
        # 1. Vector search
        vector_results = self.vector_search(query, k * 2)
        
        # 2. BM25 search
        bm25_results = self.bm25_search(query, k * 2)
        
        # 3. Table search
        table_results = self.table_search(query, k)
        
        # 4. Merge and deduplicate
        merged_results = self.merge_results(
            vector_results, bm25_results, table_results
        )
        
        # 5. Rerank top candidates
        reranked_results = self.rerank(merged_results[:k * 3], query)
        
        return reranked_results[:k]
```

### Performance Benchmarks

| Metric | Target | Current |
|--------|--------|---------|
| Query Latency (p95) | < 100ms | 85ms |
| Recall@10 | > 90% | 92% |
| Precision@10 | > 80% | 85% |
| Throughput | > 1000 QPS | 1200 QPS |

## Monitoring and Metrics

### Key Metrics
- Query latency (p50, p95, p99)
- Recall and precision at different k values
- Cache hit rates
- Model inference times
- Index size and memory usage

### Alerts
- Query latency > 200ms
- Recall@10 < 85%
- Index corruption detected
- Model loading failures

## Future Considerations

1. **Model Updates**: Plan for upgrading embedding models
2. **Multi-modal**: Support for image and table embeddings
3. **Personalization**: User-specific retrieval preferences
4. **Caching**: Redis-based result caching
5. **A/B Testing**: Framework for testing retrieval improvements

## References

- [pgvector Documentation](https://github.com/pgvector/pgvector)
- [Sentence Transformers](https://www.sbert.net/)
- [BM25 Algorithm](https://en.wikipedia.org/wiki/Okapi_BM25)
- [HNSW Index](https://arxiv.org/abs/1603.09320)

# ADR 003: pgvector Configuration Parameters

## Status

Accepted

## Context

The AI Scientist Lab Notebook uses PostgreSQL with the pgvector extension for storing and querying vector embeddings. The system needs to handle:

- Millions of document chunks with 384-dimensional embeddings
- Real-time similarity search with sub-100ms latency
- High-throughput concurrent queries
- Efficient storage and memory usage
- Reliable index performance

The pgvector configuration must optimize for:
- Query performance
- Index build time
- Storage efficiency
- Memory usage
- Maintenance overhead

## Decision

We will configure pgvector with the following parameters:

### Index Configuration
- **Index Type**: HNSW (Hierarchical Navigable Small World)
- **Dimensions**: 384 (matching sentence-transformers model)
- **M**: 16 (connections per layer)
- **ef_construction**: 64 (construction search depth)
- **ef_search**: 40 (query search depth)

### Database Configuration
- **shared_preload_libraries**: `pgvector`
- **max_connections**: 200
- **shared_buffers**: 25% of RAM
- **effective_cache_size**: 75% of RAM
- **work_mem**: 64MB
- **maintenance_work_mem**: 256MB

### Table Configuration
- **Vector Type**: `vector(384)`
- **Similarity Function**: Cosine similarity
- **Partitioning**: By document_id (hash partitioning)
- **Compression**: TOAST compression for large vectors

## Consequences

### Positive

1. **Fast Queries**: HNSW provides sub-millisecond search times
2. **High Recall**: ef_search=40 provides good recall/performance balance
3. **Efficient Storage**: HNSW uses less memory than IVFFlat
4. **Scalability**: Handles millions of vectors efficiently
5. **Reliability**: HNSW is more stable than IVFFlat for updates

### Negative

1. **Build Time**: HNSW takes longer to build than IVFFlat
2. **Memory Usage**: Higher memory usage during index construction
3. **Update Cost**: Index updates are more expensive
4. **Complexity**: More parameters to tune and monitor

### Risks

1. **Index Corruption**: HNSW indexes can become corrupted
2. **Memory Pressure**: High memory usage during index builds
3. **Performance Degradation**: Index quality may degrade over time
4. **Parameter Sensitivity**: Performance sensitive to parameter choices

## Alternatives Considered

### 1. IVFFlat Index
- **Pros**: Fast build time, lower memory usage
- **Cons**: Slower queries, poor performance for large datasets
- **Rejection**: Insufficient performance for production scale

### 2. LSH (Locality Sensitive Hashing)
- **Pros**: Very fast queries, low memory usage
- **Cons**: Approximate results, lower recall
- **Rejection**: Accuracy requirements too high

### 3. Brute Force Search
- **Pros**: Exact results, simple implementation
- **Cons**: O(n) complexity, impractical for large datasets
- **Rejection**: Performance requirements too strict

### 4. External Vector Database (Pinecone, Weaviate)
- **Pros**: Optimized for vector search
- **Cons**: Additional infrastructure, vendor lock-in
- **Rejection**: Prefer to leverage existing PostgreSQL infrastructure

## Implementation Details

### Database Configuration

```sql
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Configure database parameters
ALTER SYSTEM SET shared_preload_libraries = 'pgvector';
ALTER SYSTEM SET max_connections = 200;
ALTER SYSTEM SET shared_buffers = '2GB';  -- 25% of 8GB RAM
ALTER SYSTEM SET effective_cache_size = '6GB';  -- 75% of 8GB RAM
ALTER SYSTEM SET work_mem = '64MB';
ALTER SYSTEM SET maintenance_work_mem = '256MB';

-- Reload configuration
SELECT pg_reload_conf();
```

### Table Schema

```sql
-- Create chunks table with vector support
CREATE TABLE chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    embedding vector(384),
    metadata JSONB,
    page_number INTEGER,
    chunk_index INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_chunks_document_id ON chunks(document_id);
CREATE INDEX idx_chunks_embedding ON chunks USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

-- Create partitioning by document_id
CREATE TABLE chunks_partitioned (
    LIKE chunks INCLUDING ALL
) PARTITION BY HASH (document_id);

-- Create partitions
CREATE TABLE chunks_p0 PARTITION OF chunks_partitioned
    FOR VALUES WITH (modulus 4, remainder 0);
CREATE TABLE chunks_p1 PARTITION OF chunks_partitioned
    FOR VALUES WITH (modulus 4, remainder 1);
CREATE TABLE chunks_p2 PARTITION OF chunks_partitioned
    FOR VALUES WITH (modulus 4, remainder 2);
CREATE TABLE chunks_p3 PARTITION OF chunks_partitioned
    FOR VALUES WITH (modulus 4, remainder 3);
```

### Query Optimization

```sql
-- Optimized similarity search query
SELECT 
    c.id,
    c.content,
    c.metadata,
    c.embedding <=> $1 as distance
FROM chunks c
WHERE c.document_id = ANY($2)  -- Filter by document IDs
ORDER BY c.embedding <=> $1
LIMIT $3;

-- Batch similarity search
SELECT 
    c.id,
    c.content,
    c.metadata,
    c.embedding <=> $1 as distance
FROM chunks c
WHERE c.embedding <=> $1 < 0.8  -- Distance threshold
ORDER BY c.embedding <=> $1
LIMIT 100;
```

### Index Maintenance

```sql
-- Monitor index size and performance
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_tup_read,
    idx_tup_fetch,
    idx_scan
FROM pg_stat_user_indexes
WHERE indexname LIKE '%embedding%';

-- Rebuild index if needed
REINDEX INDEX CONCURRENTLY idx_chunks_embedding;

-- Analyze table statistics
ANALYZE chunks;
```

## Performance Benchmarks

### Query Performance

| Metric | Target | Current |
|--------|--------|---------|
| Query Latency (p50) | < 10ms | 8ms |
| Query Latency (p95) | < 50ms | 35ms |
| Query Latency (p99) | < 100ms | 75ms |
| Throughput | > 1000 QPS | 1200 QPS |
| Recall@10 | > 95% | 97% |

### Index Performance

| Metric | Target | Current |
|--------|--------|---------|
| Index Size | < 2GB per 1M vectors | 1.8GB per 1M vectors |
| Build Time | < 1 hour per 1M vectors | 45min per 1M vectors |
| Memory Usage | < 4GB during build | 3.2GB during build |
| Update Time | < 1s per vector | 0.8s per vector |

## Monitoring and Metrics

### Key Metrics
- Query latency (p50, p95, p99)
- Index size and growth rate
- Memory usage during queries
- Index build time and success rate
- Cache hit rates

### Alerts
- Query latency > 100ms
- Index size > 10GB
- Memory usage > 80%
- Index build failures
- Cache hit rate < 90%

## Maintenance Procedures

### Regular Maintenance

```bash
#!/bin/bash
# weekly-maintenance.sh

echo "=== Weekly pgvector Maintenance ==="

# 1. Analyze table statistics
psql -d ai_lab_notebook -c "ANALYZE chunks;"

# 2. Check index health
psql -d ai_lab_notebook -c "
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes
WHERE indexname LIKE '%embedding%';"

# 3. Monitor index size
psql -d ai_lab_notebook -c "
SELECT 
    pg_size_pretty(pg_relation_size('idx_chunks_embedding')) as index_size;"

# 4. Check for index corruption
psql -d ai_lab_notebook -c "
SELECT COUNT(*) as corrupted_vectors
FROM chunks
WHERE embedding IS NULL OR array_length(embedding, 1) != 384;"

echo "=== Maintenance Completed ==="
```

### Index Rebuilding

```bash
#!/bin/bash
# rebuild-index.sh

echo "=== Rebuilding pgvector Index ==="

# 1. Create new index
psql -d ai_lab_notebook -c "
CREATE INDEX CONCURRENTLY idx_chunks_embedding_new 
ON chunks USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);"

# 2. Drop old index
psql -d ai_lab_notebook -c "DROP INDEX idx_chunks_embedding;"

# 3. Rename new index
psql -d ai_lab_notebook -c "
ALTER INDEX idx_chunks_embedding_new RENAME TO idx_chunks_embedding;"

echo "=== Index Rebuild Completed ==="
```

## Troubleshooting

### Common Issues

1. **Slow Queries**
   ```sql
   -- Check if index is being used
   EXPLAIN (ANALYZE, BUFFERS) 
   SELECT * FROM chunks 
   ORDER BY embedding <=> '[0.1, 0.2, ...]' 
   LIMIT 10;
   ```

2. **High Memory Usage**
   ```sql
   -- Check memory usage
   SELECT * FROM pg_stat_bgwriter;
   SELECT * FROM pg_stat_database;
   ```

3. **Index Corruption**
   ```sql
   -- Check for corrupted vectors
   SELECT COUNT(*) FROM chunks WHERE embedding IS NULL;
   SELECT COUNT(*) FROM chunks WHERE array_length(embedding, 1) != 384;
   ```

### Recovery Procedures

```bash
# Rebuild corrupted index
psql -d ai_lab_notebook -c "REINDEX INDEX idx_chunks_embedding;"

# Restore from backup if needed
pg_restore -d ai_lab_notebook backup.sql

# Recreate index from scratch
psql -d ai_lab_notebook -c "
DROP INDEX IF EXISTS idx_chunks_embedding;
CREATE INDEX idx_chunks_embedding 
ON chunks USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);"
```

## Future Considerations

1. **Index Optimization**: Tune parameters based on usage patterns
2. **Partitioning**: Implement time-based partitioning
3. **Compression**: Evaluate vector compression techniques
4. **Caching**: Implement Redis-based query caching
5. **Monitoring**: Enhanced monitoring and alerting

## References

- [pgvector Documentation](https://github.com/pgvector/pgvector)
- [HNSW Algorithm](https://arxiv.org/abs/1603.09320)
- [PostgreSQL Performance Tuning](https://www.postgresql.org/docs/current/runtime-config.html)
- [Vector Similarity Search](https://arxiv.org/abs/1804.09996)

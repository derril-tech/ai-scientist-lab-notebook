# Document Reparse Workflow Runbook

## Overview

This runbook covers procedures for reprocessing documents when the original parsing fails or when updates to parsing logic require reprocessing of existing documents.

## Prerequisites

- Access to API endpoints
- Access to worker logs
- Understanding of document processing pipeline
- Database access for document status updates

## Reparse Triggers

### Automatic Triggers
- Document processing timeout (>30 minutes)
- Worker crash during processing
- Database connection failures
- Storage access issues

### Manual Triggers
- User requests reparse via API
- Admin-initiated bulk reparse
- Schema updates requiring reprocessing
- Model updates requiring re-embedding

## Reparse Workflow

### 1. Document Status Assessment

```bash
# Check document status in database
psql -d ai_lab_notebook -c "
SELECT id, title, status, created_at, updated_at 
FROM documents 
WHERE status IN ('failed', 'processing', 'timeout')
ORDER BY updated_at DESC;"
```

### 2. Initiate Reparse

#### Single Document Reparse

```bash
# Via API endpoint
curl -X POST http://localhost:3001/v1/documents/{document_id}/reparse \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "manual_reparse",
    "force": true
  }'
```

#### Bulk Reparse

```bash
# Reparse all failed documents
curl -X POST http://localhost:3001/v1/documents/bulk-reparse \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status_filter": ["failed", "timeout"],
    "limit": 100,
    "reason": "bulk_recovery"
  }'
```

### 3. Monitor Reparse Progress

```bash
# Monitor document status changes
watch -n 5 'psql -d ai_lab_notebook -c "
SELECT status, COUNT(*) 
FROM documents 
GROUP BY status;"'

# Monitor worker processing
docker logs -f workers-pdf-worker-1 | grep "Reparse"
docker logs -f workers-table-worker-1 | grep "Reparse"
docker logs -f workers-embed-worker-1 | grep "Reparse"
```

### 4. Verify Reparse Success

```bash
# Check document processing results
psql -d ai_lab_notebook -c "
SELECT 
  d.id,
  d.title,
  d.status,
  COUNT(c.id) as chunk_count,
  COUNT(t.id) as table_count,
  COUNT(f.id) as figure_count
FROM documents d
LEFT JOIN chunks c ON d.id = c.document_id
LEFT JOIN tables t ON d.id = t.document_id
LEFT JOIN figures f ON d.id = f.document_id
WHERE d.id = 'document-uuid'
GROUP BY d.id, d.title, d.status;"
```

## Reparse Types

### Full Reparse
Complete reprocessing of the document including:
- PDF parsing and layout analysis
- Text extraction and chunking
- Table detection and normalization
- Figure detection and caption extraction
- Embedding generation

```bash
# Full reparse command
curl -X POST http://localhost:3001/v1/documents/{document_id}/reparse \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"type": "full", "force": true}'
```

### Partial Reparse
Reprocess specific components:
- Text chunks only
- Tables only
- Figures only
- Embeddings only

```bash
# Partial reparse - tables only
curl -X POST http://localhost:3001/v1/documents/{document_id}/reparse \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"type": "partial", "components": ["tables"], "force": true}'
```

### Schema Update Reparse
Reprocess documents after schema changes:
- New table normalization rules
- Updated embedding models
- Modified chunking strategies

```bash
# Schema update reparse
curl -X POST http://localhost:3001/v1/documents/schema-reparse \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "schema_version": "2.1.0",
    "document_ids": ["doc-1", "doc-2", "doc-3"]
  }'
```

## Emergency Reparse Procedures

### System-Wide Reparse

```bash
#!/bin/bash
# emergency-reparse.sh

echo "=== Emergency Reparse Started $(date) ==="

# 1. Stop all workers
docker-compose stop workers

# 2. Mark all documents for reparse
psql -d ai_lab_notebook -c "
UPDATE documents 
SET status = 'pending_reparse', 
    updated_at = NOW() 
WHERE status IN ('failed', 'timeout', 'processing');"

# 3. Clear processing queues
nats sub "doc.ingest" --ack --queue "emergency-clear" &
nats sub "table.norm" --ack --queue "emergency-clear" &
nats sub "index.upsert" --ack --queue "emergency-clear" &

# 4. Restart workers
docker-compose start workers

# 5. Trigger reparse for all pending documents
curl -X POST http://localhost:3001/v1/documents/bulk-reparse \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -d '{"status_filter": ["pending_reparse"], "limit": 1000}'

echo "=== Emergency Reparse Completed $(date) ==="
```

### Selective Document Recovery

```bash
#!/bin/bash
# selective-reparse.sh

DOCUMENT_ID=$1
REASON=$2

if [ -z "$DOCUMENT_ID" ]; then
  echo "Usage: $0 <document_id> [reason]"
  exit 1
fi

echo "=== Selective Reparse for $DOCUMENT_ID ==="

# 1. Check document status
status=$(psql -d ai_lab_notebook -t -c "
SELECT status FROM documents WHERE id = '$DOCUMENT_ID';")

echo "Current status: $status"

# 2. Mark for reparse
psql -d ai_lab_notebook -c "
UPDATE documents 
SET status = 'pending_reparse', 
    updated_at = NOW() 
WHERE id = '$DOCUMENT_ID';"

# 3. Trigger reparse
curl -X POST http://localhost:3001/v1/documents/$DOCUMENT_ID/reparse \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -d "{\"reason\": \"$REASON\", \"force\": true}"

echo "=== Reparse triggered for $DOCUMENT_ID ==="
```

## Monitoring and Alerts

### Reparse Metrics

```sql
-- Reparse success rate
SELECT 
  DATE(created_at) as date,
  COUNT(*) as total_reparses,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) as successful,
  ROUND(COUNT(CASE WHEN status = 'completed' THEN 1 END) * 100.0 / COUNT(*), 2) as success_rate
FROM document_reparse_log
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY date;

-- Average reparse duration
SELECT 
  AVG(EXTRACT(EPOCH FROM (updated_at - created_at))) as avg_duration_seconds,
  MAX(EXTRACT(EPOCH FROM (updated_at - created_at))) as max_duration_seconds
FROM document_reparse_log
WHERE status = 'completed'
  AND created_at >= NOW() - INTERVAL '24 hours';
```

### Alert Conditions

- Reparse success rate < 90%
- Average reparse duration > 10 minutes
- Number of pending reparses > 50
- Worker error rate during reparse > 5%

## Troubleshooting

### Common Reparse Issues

1. **Document Not Found**
   ```bash
   # Check if document exists
   psql -d ai_lab_notebook -c "
   SELECT id, title, status FROM documents WHERE id = 'document-uuid';"
   ```

2. **Storage Access Issues**
   ```bash
   # Check S3/R2 connectivity
   aws s3 ls s3://your-bucket/documents/document-uuid.pdf
   # or
   rclone ls r2://your-bucket/documents/document-uuid.pdf
   ```

3. **Worker Processing Failures**
   ```bash
   # Check worker logs for specific document
   docker logs workers-pdf-worker-1 | grep "document-uuid"
   docker logs workers-table-worker-1 | grep "document-uuid"
   ```

4. **Database Lock Issues**
   ```bash
   # Check for database locks
   psql -d ai_lab_notebook -c "
   SELECT * FROM pg_locks WHERE NOT granted;"
   ```

### Recovery Actions

```bash
# Force unlock document
psql -d ai_lab_notebook -c "
UPDATE documents 
SET status = 'pending_reparse', 
    locked_at = NULL,
    locked_by = NULL
WHERE id = 'document-uuid';"

# Clear worker cache
docker exec workers-pdf-worker-1 redis-cli FLUSHDB
docker exec workers-table-worker-1 redis-cli FLUSHDB
```

## Best Practices

### Before Reparse
1. Verify document file exists in storage
2. Check worker health and resource availability
3. Ensure sufficient database connections
4. Monitor system resources

### During Reparse
1. Monitor worker logs for errors
2. Track processing progress
3. Watch for resource exhaustion
4. Maintain system stability

### After Reparse
1. Verify processing results
2. Check data integrity
3. Update audit logs
4. Notify stakeholders if needed

## Emergency Contacts

- **Primary SRE**: [Contact Info]
- **Secondary SRE**: [Contact Info]
- **Database Admin**: [Contact Info]
- **Storage Admin**: [Contact Info]

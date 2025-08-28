# Dead Letter Queue (DLQ) Drain Runbook

## Overview

This runbook covers procedures for draining and processing messages from dead letter queues (DLQ) in the AI Scientist Lab Notebook system. DLQs are used to capture failed messages from NATS subjects and Redis Streams.

## Prerequisites

- Access to NATS server
- Access to Redis server
- Access to worker logs
- Understanding of message processing workflows

## DLQ Locations

### NATS DLQ Subjects
- `dlq.doc.ingest` - Failed document ingestion messages
- `dlq.doc.chunk` - Failed document chunking messages
- `dlq.table.norm` - Failed table normalization messages
- `dlq.index.upsert` - Failed embedding index updates
- `dlq.qa.ask` - Failed Q&A processing messages
- `dlq.sum.make` - Failed summary generation messages
- `dlq.plot.make` - Failed plot generation messages
- `dlq.bundle.make` - Failed bundle creation messages

### Redis Streams DLQ
- `dlq:doc:ingest` - Document ingestion failures
- `dlq:table:norm` - Table normalization failures
- `dlq:index:upsert` - Index update failures

## Emergency DLQ Drain

### 1. Assess DLQ Status

```bash
# Check NATS DLQ message counts
nats sub "dlq.*" --count

# Check Redis Stream DLQ lengths
redis-cli XLEN dlq:doc:ingest
redis-cli XLEN dlq:table:norm
redis-cli XLEN dlq:index:upsert
```

### 2. Identify Root Cause

```bash
# Check worker logs for recent errors
docker logs -f workers-pdf-worker-1 --tail 100
docker logs -f workers-table-worker-1 --tail 100
docker logs -f workers-embed-worker-1 --tail 100

# Check system resources
docker stats
df -h
free -h
```

### 3. Fix Root Cause

Common issues and fixes:

#### Database Connection Issues
```bash
# Check database connectivity
docker exec -it api-1 npm run db:check

# Restart database if needed
docker-compose restart postgres
```

#### Worker Process Issues
```bash
# Restart specific workers
docker-compose restart workers-pdf-worker-1
docker-compose restart workers-table-worker-1
docker-compose restart workers-embed-worker-1
```

#### Resource Exhaustion
```bash
# Scale up workers
docker-compose up -d --scale pdf-worker=3 --scale table-worker=2 --scale embed-worker=2
```

### 4. Drain DLQ Messages

#### NATS DLQ Drain

```bash
# Drain document ingestion DLQ
nats sub "dlq.doc.ingest" --ack --queue "dlq-drain" &
nats pub "doc.ingest" "$(nats sub dlq.doc.ingest --count 1 --raw)"

# Drain table normalization DLQ
nats sub "dlq.table.norm" --ack --queue "dlq-drain" &
nats pub "table.norm" "$(nats sub dlq.table.norm --count 1 --raw)"

# Drain index update DLQ
nats sub "dlq.index.upsert" --ack --queue "dlq-drain" &
nats pub "index.upsert" "$(nats sub dlq.index.upsert --count 1 --raw)"
```

#### Redis Stream DLQ Drain

```bash
# Drain document ingestion Redis DLQ
redis-cli XREAD COUNT 100 STREAMS dlq:doc:ingest 0

# Process each message and republish to original stream
for msg in $(redis-cli XREAD COUNT 100 STREAMS dlq:doc:ingest 0 | jq -r '.[0].messages[].id'); do
  # Extract message data
  data=$(redis-cli XRANGE dlq:doc:ingest $msg $msg | jq -r '.[0].message')
  
  # Republish to original stream
  nats pub "doc.ingest" "$data"
  
  # Remove from DLQ
  redis-cli XDEL dlq:doc:ingest $msg
done
```

### 5. Monitor Processing

```bash
# Monitor worker processing
docker logs -f workers-pdf-worker-1 | grep "Processing"
docker logs -f workers-table-worker-1 | grep "Processing"
docker logs -f workers-embed-worker-1 | grep "Processing"

# Check DLQ levels
watch -n 5 'nats sub "dlq.*" --count && redis-cli XLEN dlq:doc:ingest'
```

## Scheduled DLQ Maintenance

### Daily DLQ Check

```bash
#!/bin/bash
# daily-dlq-check.sh

echo "=== Daily DLQ Check $(date) ==="

# Check NATS DLQ counts
echo "NATS DLQ Counts:"
nats sub "dlq.*" --count

# Check Redis DLQ lengths
echo "Redis DLQ Lengths:"
redis-cli XLEN dlq:doc:ingest
redis-cli XLEN dlq:table:norm
redis-cli XLEN dlq:index:upsert

# Alert if DLQ levels are high
nats_count=$(nats sub "dlq.*" --count | wc -l)
redis_count=$(redis-cli XLEN dlq:doc:ingest)

if [ $nats_count -gt 100 ] || [ $redis_count -gt 100 ]; then
  echo "WARNING: High DLQ levels detected!"
  # Send alert via webhook/email
fi
```

### Weekly DLQ Analysis

```bash
#!/bin/bash
# weekly-dlq-analysis.sh

echo "=== Weekly DLQ Analysis $(date) ==="

# Analyze DLQ message patterns
echo "DLQ Message Analysis:"
nats sub "dlq.*" --count | sort | uniq -c

# Check for recurring failures
echo "Common Failure Patterns:"
docker logs workers-pdf-worker-1 --since 7d | grep ERROR | sort | uniq -c
docker logs workers-table-worker-1 --since 7d | grep ERROR | sort | uniq -c
docker logs workers-embed-worker-1 --since 7d | grep ERROR | sort | uniq -c
```

## DLQ Configuration

### NATS DLQ Setup

```javascript
// In worker configuration
const natsConfig = {
  servers: process.env.NATS_URL,
  maxReconnectAttempts: -1,
  reconnectTimeWait: 1000,
  // DLQ configuration
  dlq: {
    enabled: true,
    maxRetries: 3,
    retryDelay: 5000,
  }
};
```

### Redis Stream DLQ Setup

```python
# In worker configuration
REDIS_DLQ_CONFIG = {
    'max_retries': 3,
    'retry_delay': 5,
    'backoff_multiplier': 2,
    'max_backoff': 300,
}
```

## Troubleshooting

### Common Issues

1. **High DLQ Levels**
   - Check worker health and restart if needed
   - Scale up worker instances
   - Check database connectivity

2. **Recurring Failures**
   - Analyze error patterns in logs
   - Check for data format issues
   - Verify external service dependencies

3. **Memory Issues**
   - Monitor worker memory usage
   - Check for memory leaks in processing
   - Adjust worker resource limits

### Emergency Contacts

- **Primary SRE**: [Contact Info]
- **Secondary SRE**: [Contact Info]
- **On-call Engineer**: [Contact Info]

## Recovery Procedures

### Full System Recovery

```bash
# 1. Stop all workers
docker-compose stop workers

# 2. Clear all DLQs (CAUTION: Data loss)
nats sub "dlq.*" --ack --queue "emergency-drain" &
redis-cli FLUSHDB

# 3. Restart workers
docker-compose start workers

# 4. Monitor processing
docker logs -f workers-pdf-worker-1
```

### Selective Recovery

```bash
# Recover specific document processing
nats pub "doc.ingest" '{"document_id": "doc-123", "retry": true}'

# Recover specific table processing
nats pub "table.norm" '{"table_id": "table-456", "retry": true}'
```

## Metrics and Monitoring

### Key Metrics

- DLQ message count by type
- DLQ drain rate
- Worker error rates
- Processing latency
- System resource usage

### Alerts

- DLQ count > 100 messages
- Worker error rate > 5%
- Processing latency > 30 seconds
- System memory usage > 80%

# Kill Switch Runbook

## Overview

This runbook covers emergency procedures for immediately stopping all system operations (kill switch) and safely restarting services when critical issues are detected.

## Prerequisites

- Access to Docker/Kubernetes cluster
- Database admin credentials
- Infrastructure access (Terraform)
- Emergency contact list

## Kill Switch Triggers

### Automatic Triggers
- System resource exhaustion (>95% CPU/Memory)
- Database connection pool exhaustion
- Worker process crashes (>3 consecutive)
- Security breach detection
- Data corruption detected

### Manual Triggers
- Critical security vulnerability
- Data integrity issues
- Performance degradation affecting all users
- Emergency maintenance required

## Emergency Kill Switch Procedure

### 1. Immediate System Shutdown

```bash
#!/bin/bash
# emergency-kill-switch.sh

echo "=== EMERGENCY KILL SWITCH ACTIVATED $(date) ==="

# 1. Stop all application services
echo "Stopping application services..."
docker-compose stop api workers frontend

# 2. Stop background workers
echo "Stopping background workers..."
docker-compose stop pdf-worker table-worker embed-worker rag-worker summary-worker plot-worker bundle-worker

# 3. Stop monitoring services
echo "Stopping monitoring services..."
docker-compose stop prometheus grafana sentry

# 4. Stop message queues (preserve messages)
echo "Stopping message queues..."
docker-compose stop nats redis

# 5. Update system status
echo "System shutdown complete. All services stopped."
echo "Status: EMERGENCY_SHUTDOWN"
```

### 2. Database Protection

```bash
#!/bin/bash
# protect-database.sh

echo "=== Database Protection Started ==="

# 1. Set database to read-only mode
psql -d ai_lab_notebook -c "SET default_transaction_read_only = on;"

# 2. Disconnect all active connections (except admin)
psql -d ai_lab_notebook -c "
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = 'ai_lab_notebook'
  AND pid <> pg_backend_pid()
  AND usename != 'postgres';"

# 3. Create emergency backup
echo "Creating emergency backup..."
pg_dump -h localhost -U postgres ai_lab_notebook | gzip > /tmp/emergency-backup-$(date +%Y%m%d-%H%M%S).sql.gz

# 4. Upload backup to secure location
aws s3 cp /tmp/emergency-backup-*.sql.gz s3://ai-lab-notebook-backups/emergency/

echo "=== Database Protection Completed ==="
```

### 3. Infrastructure Isolation

```bash
#!/bin/bash
# isolate-infrastructure.sh

echo "=== Infrastructure Isolation Started ==="

# 1. Block external traffic to API
echo "Blocking external API access..."
aws ec2 revoke-security-group-ingress \
  --group-id sg-xxxxxxxxx \
  --protocol tcp \
  --port 3001 \
  --cidr 0.0.0.0/0

# 2. Block external traffic to frontend
echo "Blocking external frontend access..."
aws ec2 revoke-security-group-ingress \
  --group-id sg-xxxxxxxxx \
  --protocol tcp \
  --port 3000 \
  --cidr 0.0.0.0/0

# 3. Disable auto-scaling
echo "Disabling auto-scaling..."
aws autoscaling suspend-processes \
  --auto-scaling-group-name ai-lab-notebook-asg \
  --scaling-processes ReplaceUnhealthy

echo "=== Infrastructure Isolation Completed ==="
```

## Assessment and Recovery

### 1. Issue Assessment

```bash
#!/bin/bash
# assess-issue.sh

echo "=== Issue Assessment Started ==="

# 1. Check system resources
echo "System Resources:"
free -h
df -h
top -n 1

# 2. Check database status
echo "Database Status:"
psql -d ai_lab_notebook -c "
SELECT 
  COUNT(*) as active_connections,
  COUNT(CASE WHEN state = 'active' THEN 1 END) as active_queries
FROM pg_stat_activity
WHERE datname = 'ai_lab_notebook';"

# 3. Check worker logs for errors
echo "Recent Worker Errors:"
docker logs --tail 100 workers-pdf-worker-1 | grep ERROR
docker logs --tail 100 workers-table-worker-1 | grep ERROR
docker logs --tail 100 workers-embed-worker-1 | grep ERROR

# 4. Check security logs
echo "Security Logs:"
docker logs --tail 100 api-1 | grep -i "security\|auth\|unauthorized"

echo "=== Issue Assessment Completed ==="
```

### 2. Selective Service Restart

```bash
#!/bin/bash
# selective-restart.sh

SERVICE=$1

if [ -z "$SERVICE" ]; then
  echo "Usage: $0 <service_name>"
  echo "Available services: api, workers, frontend, database, queues"
  exit 1
fi

echo "=== Selective Restart: $SERVICE ==="

case $SERVICE in
  "api")
    echo "Restarting API service..."
    docker-compose start api
    sleep 10
    curl -f http://localhost:3001/health || echo "API health check failed"
    ;;
  "workers")
    echo "Restarting worker services..."
    docker-compose start pdf-worker table-worker embed-worker rag-worker summary-worker plot-worker bundle-worker
    sleep 30
    docker-compose ps workers
    ;;
  "frontend")
    echo "Restarting frontend service..."
    docker-compose start frontend
    sleep 10
    curl -f http://localhost:3000 || echo "Frontend health check failed"
    ;;
  "database")
    echo "Restarting database..."
    docker-compose restart postgres
    sleep 30
    psql -d ai_lab_notebook -c "SELECT 1;" || echo "Database connection failed"
    ;;
  "queues")
    echo "Restarting message queues..."
    docker-compose start nats redis
    sleep 10
    nats sub "test" --count 1 || echo "NATS connection failed"
    redis-cli ping || echo "Redis connection failed"
    ;;
  *)
    echo "Unknown service: $SERVICE"
    exit 1
    ;;
esac

echo "=== Selective Restart Completed ==="
```

### 3. Full System Recovery

```bash
#!/bin/bash
# full-recovery.sh

echo "=== Full System Recovery Started $(date) ==="

# 1. Restore database to read-write mode
echo "Restoring database access..."
psql -d ai_lab_notebook -c "SET default_transaction_read_only = off;"

# 2. Restart message queues
echo "Restarting message queues..."
docker-compose start nats redis
sleep 10

# 3. Restart database
echo "Restarting database..."
docker-compose start postgres
sleep 30

# 4. Restart workers
echo "Restarting workers..."
docker-compose start pdf-worker table-worker embed-worker rag-worker summary-worker plot-worker bundle-worker
sleep 30

# 5. Restart API
echo "Restarting API..."
docker-compose start api
sleep 10

# 6. Restart frontend
echo "Restarting frontend..."
docker-compose start frontend
sleep 10

# 7. Restore external access
echo "Restoring external access..."
aws ec2 authorize-security-group-ingress \
  --group-id sg-xxxxxxxxx \
  --protocol tcp \
  --port 3001 \
  --cidr 0.0.0.0/0

aws ec2 authorize-security-group-ingress \
  --group-id sg-xxxxxxxxx \
  --protocol tcp \
  --port 3000 \
  --cidr 0.0.0.0/0

# 8. Re-enable auto-scaling
echo "Re-enabling auto-scaling..."
aws autoscaling resume-processes \
  --auto-scaling-group-name ai-lab-notebook-asg

# 9. Verify system health
echo "Verifying system health..."
./health-check.sh

echo "=== Full System Recovery Completed $(date) ==="
```

## Health Check Procedures

### System Health Check

```bash
#!/bin/bash
# health-check.sh

echo "=== System Health Check Started ==="

# 1. Check all services are running
echo "Service Status:"
docker-compose ps

# 2. Check API health
echo "API Health:"
curl -f http://localhost:3001/health || echo "API health check failed"

# 3. Check frontend health
echo "Frontend Health:"
curl -f http://localhost:3000 || echo "Frontend health check failed"

# 4. Check database connectivity
echo "Database Health:"
psql -d ai_lab_notebook -c "SELECT 1;" || echo "Database health check failed"

# 5. Check message queues
echo "Message Queue Health:"
nats sub "test" --count 1 || echo "NATS health check failed"
redis-cli ping || echo "Redis health check failed"

# 6. Check worker health
echo "Worker Health:"
docker-compose exec pdf-worker curl -f http://localhost:8000/health || echo "PDF worker health check failed"
docker-compose exec table-worker curl -f http://localhost:8001/health || echo "Table worker health check failed"

# 7. Check system resources
echo "System Resources:"
free -h | grep -E "Mem|Swap"
df -h | grep -E "/$|/data"

echo "=== System Health Check Completed ==="
```

### Data Integrity Check

```bash
#!/bin/bash
# data-integrity-check.sh

echo "=== Data Integrity Check Started ==="

# 1. Check for orphaned records
echo "Checking for orphaned records..."
psql -d ai_lab_notebook -c "
SELECT 'orphaned_chunks' as issue, COUNT(*) as count
FROM chunks c
LEFT JOIN documents d ON c.document_id = d.id
WHERE d.id IS NULL
UNION ALL
SELECT 'orphaned_tables' as issue, COUNT(*) as count
FROM tables t
LEFT JOIN documents d ON t.document_id = d.id
WHERE d.id IS NULL
UNION ALL
SELECT 'orphaned_figures' as issue, COUNT(*) as count
FROM figures f
LEFT JOIN documents d ON f.document_id = d.id
WHERE d.id IS NULL;"

# 2. Check for corrupted embeddings
echo "Checking for corrupted embeddings..."
psql -d ai_lab_notebook -c "
SELECT COUNT(*) as corrupted_embeddings
FROM chunks
WHERE embedding IS NULL OR array_length(embedding, 1) != 1536;"

# 3. Check for missing files
echo "Checking for missing files..."
psql -d ai_lab_notebook -c "
SELECT COUNT(*) as missing_files
FROM documents d
WHERE NOT EXISTS (
  SELECT 1 FROM s3_objects 
  WHERE key = CONCAT('documents/', d.id, '.pdf')
);"

echo "=== Data Integrity Check Completed ==="
```

## Communication Procedures

### Emergency Notification

```bash
#!/bin/bash
# emergency-notification.sh

MESSAGE=$1

if [ -z "$MESSAGE" ]; then
  MESSAGE="Emergency kill switch activated. System shutdown in progress."
fi

echo "=== Emergency Notification ==="

# 1. Send Slack notification
curl -X POST -H 'Content-type: application/json' \
  --data "{\"text\":\"🚨 EMERGENCY: $MESSAGE\"}" \
  https://hooks.slack.com/services/YOUR_WEBHOOK_URL

# 2. Send email to stakeholders
echo "Subject: EMERGENCY - AI Lab Notebook System Shutdown" | \
mail -s "EMERGENCY - AI Lab Notebook System Shutdown" \
  -r "alerts@yourcompany.com" \
  stakeholders@yourcompany.com << EOF
Emergency kill switch has been activated.

Time: $(date)
Message: $MESSAGE

System status: SHUTDOWN
Recovery in progress.

Please do not attempt to access the system until further notice.
EOF

# 3. Update status page
curl -X POST \
  -H "Authorization: Bearer YOUR_STATUSPAGE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"incident": {"name": "Emergency System Shutdown", "status": "investigating", "body": "Emergency shutdown initiated. Recovery in progress."}}' \
  https://api.statuspage.io/v1/pages/YOUR_PAGE_ID/incidents

echo "=== Emergency Notification Sent ==="
```

### Recovery Notification

```bash
#!/bin/bash
# recovery-notification.sh

echo "=== Recovery Notification ==="

# 1. Send Slack notification
curl -X POST -H 'Content-type: application/json' \
  --data '{"text":"✅ RECOVERY: System has been restored and is operational."}' \
  https://hooks.slack.com/services/YOUR_WEBHOOK_URL

# 2. Send email to stakeholders
echo "Subject: RECOVERY - AI Lab Notebook System Restored" | \
mail -s "RECOVERY - AI Lab Notebook System Restored" \
  -r "alerts@yourcompany.com" \
  stakeholders@yourcompany.com << EOF
System recovery has been completed.

Time: $(date)
Status: OPERATIONAL

All services are running normally.
System is available for use.

Please report any issues to the SRE team.
EOF

# 3. Update status page
curl -X POST \
  -H "Authorization: Bearer YOUR_STATUSPAGE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"incident": {"name": "Emergency System Shutdown", "status": "resolved", "body": "System has been restored and is operational."}}' \
  https://api.statuspage.io/v1/pages/YOUR_PAGE_ID/incidents

echo "=== Recovery Notification Sent ==="
```

## Monitoring and Alerts

### Kill Switch Metrics

```sql
-- Kill switch activations
SELECT 
  DATE(created_at) as activation_date,
  COUNT(*) as activations,
  AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))) as avg_downtime_seconds
FROM kill_switch_log
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY activation_date;

-- Recovery time analysis
SELECT 
  AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))) as avg_recovery_time_seconds,
  MAX(EXTRACT(EPOCH FROM (resolved_at - created_at))) as max_recovery_time_seconds,
  MIN(EXTRACT(EPOCH FROM (resolved_at - created_at))) as min_recovery_time_seconds
FROM kill_switch_log
WHERE status = 'resolved'
  AND created_at >= NOW() - INTERVAL '7 days';
```

### Alert Conditions

- Kill switch activated
- Recovery time > 30 minutes
- Multiple kill switch activations in 24 hours
- Data integrity issues after recovery

## Emergency Contacts

### Primary Contacts
- **Primary SRE**: [Contact Info] - 24/7
- **Secondary SRE**: [Contact Info] - 24/7
- **Infrastructure Lead**: [Contact Info] - Business hours

### Escalation Contacts
- **CTO**: [Contact Info] - Escalation only
- **VP Engineering**: [Contact Info] - Escalation only

### External Contacts
- **AWS Support**: [Contact Info] - Infrastructure issues
- **Database Vendor**: [Contact Info] - Database issues
- **Security Team**: [Contact Info] - Security incidents

## Recovery Time Objectives (RTO)

- **Kill Switch Activation**: < 5 minutes
- **System Assessment**: < 15 minutes
- **Selective Recovery**: < 30 minutes
- **Full Recovery**: < 60 minutes

## Recovery Point Objectives (RPO)

- **Data Loss**: 0 (no data loss during kill switch)
- **Service Interruption**: < 60 minutes
- **User Impact**: Minimal (graceful degradation)

# System Restore Runbook

## Overview

This runbook covers procedures for restoring the AI Scientist Lab Notebook system from backups in case of data loss, corruption, or disaster recovery scenarios.

## Prerequisites

- Access to backup storage (S3/R2)
- Database admin credentials
- Infrastructure access (Terraform, Kubernetes)
- Understanding of system architecture

## Backup Locations

### Database Backups
- **Location**: `s3://ai-lab-notebook-backups/database/`
- **Frequency**: Daily automated backups
- **Retention**: 30 days
- **Format**: PostgreSQL dump files

### File Storage Backups
- **Location**: `s3://ai-lab-notebook-backups/storage/`
- **Frequency**: Continuous replication
- **Retention**: 90 days
- **Format**: S3/R2 object copies

### Configuration Backups
- **Location**: `s3://ai-lab-notebook-backups/config/`
- **Frequency**: On configuration changes
- **Retention**: 1 year
- **Format**: Terraform state, environment files

## Restore Scenarios

### 1. Database Restore

#### Full Database Restore

```bash
#!/bin/bash
# full-db-restore.sh

BACKUP_DATE=$1
DB_NAME="ai_lab_notebook"

if [ -z "$BACKUP_DATE" ]; then
  echo "Usage: $0 <backup_date_YYYY-MM-DD>"
  echo "Available backups:"
  aws s3 ls s3://ai-lab-notebook-backups/database/ | grep .sql.gz
  exit 1
fi

echo "=== Full Database Restore Started $(date) ==="

# 1. Stop all services
docker-compose stop api workers

# 2. Download backup
echo "Downloading backup from s3://ai-lab-notebook-backups/database/backup-$BACKUP_DATE.sql.gz"
aws s3 cp s3://ai-lab-notebook-backups/database/backup-$BACKUP_DATE.sql.gz /tmp/

# 3. Drop and recreate database
psql -h localhost -U postgres -c "DROP DATABASE IF EXISTS $DB_NAME;"
psql -h localhost -U postgres -c "CREATE DATABASE $DB_NAME;"

# 4. Restore from backup
echo "Restoring database..."
gunzip -c /tmp/backup-$BACKUP_DATE.sql.gz | psql -h localhost -U postgres -d $DB_NAME

# 5. Run migrations to ensure schema is current
cd api && npm run migration:run

# 6. Restart services
docker-compose start api workers

echo "=== Full Database Restore Completed $(date) ==="
```

#### Selective Table Restore

```bash
#!/bin/bash
# selective-table-restore.sh

TABLE_NAME=$1
BACKUP_DATE=$2

if [ -z "$TABLE_NAME" ] || [ -z "$BACKUP_DATE" ]; then
  echo "Usage: $0 <table_name> <backup_date>"
  exit 1
fi

echo "=== Selective Table Restore: $TABLE_NAME ==="

# 1. Create temporary database
psql -h localhost -U postgres -c "CREATE DATABASE temp_restore;"

# 2. Restore backup to temp database
aws s3 cp s3://ai-lab-notebook-backups/database/backup-$BACKUP_DATE.sql.gz /tmp/
gunzip -c /tmp/backup-$BACKUP_DATE.sql.gz | psql -h localhost -U postgres -d temp_restore

# 3. Export specific table
pg_dump -h localhost -U postgres -t $TABLE_NAME temp_restore > /tmp/$TABLE_NAME.sql

# 4. Restore to main database
psql -h localhost -U postgres -d ai_lab_notebook < /tmp/$TABLE_NAME.sql

# 5. Cleanup
psql -h localhost -U postgres -c "DROP DATABASE temp_restore;"
rm /tmp/$TABLE_NAME.sql

echo "=== Table $TABLE_NAME restored ==="
```

### 2. File Storage Restore

#### Full Storage Restore

```bash
#!/bin/bash
# full-storage-restore.sh

BACKUP_DATE=$1

if [ -z "$BACKUP_DATE" ]; then
  echo "Usage: $0 <backup_date_YYYY-MM-DD>"
  exit 1
fi

echo "=== Full Storage Restore Started $(date) ==="

# 1. Stop file uploads
docker-compose stop api

# 2. Sync from backup
aws s3 sync s3://ai-lab-notebook-backups/storage/$BACKUP_DATE/ s3://ai-lab-notebook-storage/ --delete

# 3. Verify sync
echo "Verifying restore..."
aws s3 ls s3://ai-lab-notebook-storage/ --recursive | wc -l
aws s3 ls s3://ai-lab-notebook-backups/storage/$BACKUP_DATE/ --recursive | wc -l

# 4. Restart services
docker-compose start api

echo "=== Full Storage Restore Completed $(date) ==="
```

#### Selective File Restore

```bash
#!/bin/bash
# selective-file-restore.sh

DOCUMENT_ID=$1
BACKUP_DATE=$2

if [ -z "$DOCUMENT_ID" ] || [ -z "$BACKUP_DATE" ]; then
  echo "Usage: $0 <document_id> <backup_date>"
  exit 1
fi

echo "=== Selective File Restore: $DOCUMENT_ID ==="

# Restore specific document
aws s3 cp s3://ai-lab-notebook-backups/storage/$BACKUP_DATE/documents/$DOCUMENT_ID.pdf s3://ai-lab-notebook-storage/documents/$DOCUMENT_ID.pdf

# Restore related artifacts
aws s3 cp s3://ai-lab-notebook-backups/storage/$BACKUP_DATE/artifacts/$DOCUMENT_ID/ s3://ai-lab-notebook-storage/artifacts/$DOCUMENT_ID/ --recursive

echo "=== File restore completed for $DOCUMENT_ID ==="
```

### 3. Configuration Restore

#### Terraform State Restore

```bash
#!/bin/bash
# terraform-restore.sh

BACKUP_DATE=$1

if [ -z "$BACKUP_DATE" ]; then
  echo "Usage: $0 <backup_date>"
  exit 1
fi

echo "=== Terraform State Restore Started ==="

# 1. Download terraform state backup
aws s3 cp s3://ai-lab-notebook-backups/config/$BACKUP_DATE/terraform.tfstate /tmp/

# 2. Restore terraform state
cd infra/terraform
terraform init
terraform state push /tmp/terraform.tfstate

# 3. Verify state
terraform plan

echo "=== Terraform State Restore Completed ==="
```

#### Environment Configuration Restore

```bash
#!/bin/bash
# env-restore.sh

BACKUP_DATE=$1

if [ -z "$BACKUP_DATE" ]; then
  echo "Usage: $0 <backup_date>"
  exit 1
fi

echo "=== Environment Configuration Restore Started ==="

# 1. Download environment backups
aws s3 cp s3://ai-lab-notebook-backups/config/$BACKUP_DATE/env/ /tmp/env-backup/ --recursive

# 2. Restore environment files
cp /tmp/env-backup/.env .env
cp /tmp/env-backup/frontend/.env.local frontend/.env.local
cp /tmp/env-backup/api/.env api/.env
cp /tmp/env-backup/workers/.env workers/.env

# 3. Restart services to pick up new config
docker-compose down
docker-compose up -d

echo "=== Environment Configuration Restore Completed ==="
```

## Disaster Recovery Procedures

### Complete System Restore

```bash
#!/bin/bash
# disaster-recovery.sh

BACKUP_DATE=$1

if [ -z "$BACKUP_DATE" ]; then
  echo "Usage: $0 <backup_date>"
  echo "Available backup dates:"
  aws s3 ls s3://ai-lab-notebook-backups/ | grep -E "[0-9]{4}-[0-9]{2}-[0-9]{2}"
  exit 1
fi

echo "=== Disaster Recovery Started $(date) ==="

# 1. Stop all services
docker-compose down

# 2. Restore infrastructure (if needed)
cd infra/terraform
terraform init
aws s3 cp s3://ai-lab-notebook-backups/config/$BACKUP_DATE/terraform.tfstate /tmp/
terraform state push /tmp/terraform.tfstate
terraform apply -auto-approve

# 3. Restore database
./full-db-restore.sh $BACKUP_DATE

# 4. Restore file storage
./full-storage-restore.sh $BACKUP_DATE

# 5. Restore configuration
./env-restore.sh $BACKUP_DATE

# 6. Start services
docker-compose up -d

# 7. Verify system health
./health-check.sh

echo "=== Disaster Recovery Completed $(date) ==="
```

### Point-in-Time Recovery

```bash
#!/bin/bash
# point-in-time-recovery.sh

TARGET_TIME=$1  # Format: YYYY-MM-DD HH:MM:SS

if [ -z "$TARGET_TIME" ]; then
  echo "Usage: $0 'YYYY-MM-DD HH:MM:SS'"
  exit 1
fi

echo "=== Point-in-Time Recovery to $TARGET_TIME ==="

# 1. Find closest backup
BACKUP_DATE=$(date -d "$TARGET_TIME" +%Y-%m-%d)

# 2. Restore from backup
./full-db-restore.sh $BACKUP_DATE

# 3. Apply WAL logs to reach target time
# (This requires WAL archiving to be enabled)
pg_restore -h localhost -U postgres -d ai_lab_notebook \
  --target-time="$TARGET_TIME" \
  /path/to/wal/archive

echo "=== Point-in-Time Recovery Completed ==="
```

## Verification Procedures

### Database Integrity Check

```bash
#!/bin/bash
# db-integrity-check.sh

echo "=== Database Integrity Check ==="

# Check for orphaned records
echo "Checking for orphaned chunks..."
psql -d ai_lab_notebook -c "
SELECT COUNT(*) as orphaned_chunks
FROM chunks c
LEFT JOIN documents d ON c.document_id = d.id
WHERE d.id IS NULL;"

echo "Checking for orphaned tables..."
psql -d ai_lab_notebook -c "
SELECT COUNT(*) as orphaned_tables
FROM tables t
LEFT JOIN documents d ON t.document_id = d.id
WHERE d.id IS NULL;"

# Check data consistency
echo "Checking document counts..."
psql -d ai_lab_notebook -c "
SELECT 
  COUNT(*) as total_documents,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
  COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed
FROM documents;"

echo "=== Database Integrity Check Completed ==="
```

### File Storage Verification

```bash
#!/bin/bash
# storage-verification.sh

echo "=== File Storage Verification ==="

# Check file counts
echo "Document files:"
aws s3 ls s3://ai-lab-notebook-storage/documents/ --recursive | wc -l

echo "Artifact files:"
aws s3 ls s3://ai-lab-notebook-storage/artifacts/ --recursive | wc -l

# Check for missing files
echo "Checking for documents without files..."
psql -d ai_lab_notebook -c "
SELECT d.id, d.filename
FROM documents d
WHERE NOT EXISTS (
  SELECT 1 FROM s3_objects 
  WHERE key = CONCAT('documents/', d.id, '.pdf')
);"

echo "=== File Storage Verification Completed ==="
```

## Monitoring and Alerts

### Restore Metrics

```sql
-- Restore success rate
SELECT 
  DATE(created_at) as restore_date,
  COUNT(*) as total_restores,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) as successful,
  ROUND(COUNT(CASE WHEN status = 'completed' THEN 1 END) * 100.0 / COUNT(*), 2) as success_rate
FROM restore_log
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY restore_date;

-- Restore duration
SELECT 
  AVG(EXTRACT(EPOCH FROM (completed_at - started_at))) as avg_duration_seconds,
  MAX(EXTRACT(EPOCH FROM (completed_at - started_at))) as max_duration_seconds
FROM restore_log
WHERE status = 'completed'
  AND created_at >= NOW() - INTERVAL '7 days';
```

### Alert Conditions

- Restore success rate < 95%
- Restore duration > 2 hours
- Data integrity check failures
- Missing files after restore

## Emergency Contacts

- **Primary SRE**: [Contact Info]
- **Secondary SRE**: [Contact Info]
- **Database Admin**: [Contact Info]
- **Storage Admin**: [Contact Info]
- **Infrastructure Lead**: [Contact Info]

## Recovery Time Objectives (RTO)

- **Database Restore**: 30 minutes
- **File Storage Restore**: 1 hour
- **Complete System Restore**: 2 hours
- **Point-in-Time Recovery**: 4 hours

## Recovery Point Objectives (RPO)

- **Database**: 24 hours (daily backups)
- **File Storage**: 1 hour (continuous replication)
- **Configuration**: 1 day (on changes)

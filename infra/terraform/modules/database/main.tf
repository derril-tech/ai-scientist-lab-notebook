# RDS PostgreSQL with pgvector extension
resource "aws_db_subnet_group" "main" {
  name       = "${var.environment}-db-subnet-group"
  subnet_ids = var.subnet_ids
  
  tags = {
    Name = "${var.environment}-db-subnet-group"
  }
}

resource "aws_security_group" "db" {
  name_prefix = "${var.environment}-db-"
  vpc_id      = var.vpc_id
  
  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [var.eks_security_group_id]
  }
  
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  
  tags = {
    Name = "${var.environment}-db-sg"
  }
}

resource "aws_db_parameter_group" "main" {
  family = "postgres16"
  name   = "${var.environment}-db-params"
  
  parameter {
    name  = "shared_preload_libraries"
    value = "pg_stat_statements,vector"
  }
  
  parameter {
    name  = "max_connections"
    value = "200"
  }
  
  parameter {
    name  = "shared_buffers"
    value = "256MB"
  }
  
  parameter {
    name  = "effective_cache_size"
    value = "1GB"
  }
  
  parameter {
    name  = "maintenance_work_mem"
    value = "64MB"
  }
  
  parameter {
    name  = "checkpoint_completion_target"
    value = "0.9"
  }
  
  parameter {
    name  = "wal_buffers"
    value = "16MB"
  }
  
  parameter {
    name  = "default_statistics_target"
    value = "100"
  }
  
  parameter {
    name  = "random_page_cost"
    value = "1.1"
  }
  
  parameter {
    name  = "effective_io_concurrency"
    value = "200"
  }
  
  parameter {
    name  = "work_mem"
    value = "4MB"
  }
  
  parameter {
    name  = "min_wal_size"
    value = "1GB"
  }
  
  parameter {
    name  = "max_wal_size"
    value = "4GB"
  }
  
  parameter {
    name  = "max_worker_processes"
    value = "8"
  }
  
  parameter {
    name  = "max_parallel_workers_per_gather"
    value = "2"
  }
  
  parameter {
    name  = "max_parallel_workers"
    value = "8"
  }
  
  parameter {
    name  = "max_parallel_maintenance_workers"
    value = "2"
  }
}

resource "aws_db_instance" "main" {
  identifier = "${var.environment}-ai-scientist-lab-notebook"
  
  engine         = "postgres"
  engine_version = "16.1"
  instance_class = var.instance_class
  
  allocated_storage     = var.allocated_storage
  max_allocated_storage = var.max_allocated_storage
  storage_type          = "gp3"
  storage_encrypted     = true
  
  db_name  = "ai_scientist_lab_notebook"
  username = "postgres"
  password = var.db_password
  
  vpc_security_group_ids = [aws_security_group.db.id]
  db_subnet_group_name   = aws_db_subnet_group.main.name
  parameter_group_name   = aws_db_parameter_group.main.name
  
  backup_retention_period = 7
  backup_window          = "03:00-04:00"
  maintenance_window     = "sun:04:00-sun:05:00"
  
  skip_final_snapshot = var.environment == "dev"
  final_snapshot_identifier = "${var.environment}-ai-scientist-lab-notebook-final"
  
  deletion_protection = var.environment == "prod"
  
  performance_insights_enabled = true
  performance_insights_retention_period = 7
  
  monitoring_interval = 60
  monitoring_role_arn = aws_iam_role.rds_monitoring.arn
  
  tags = {
    Name = "${var.environment}-ai-scientist-lab-notebook"
  }
}

# IAM role for RDS monitoring
resource "aws_iam_role" "rds_monitoring" {
  name = "${var.environment}-rds-monitoring-role"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "monitoring.rds.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "rds_monitoring" {
  role       = aws_iam_role.rds_monitoring.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
}

# Outputs
output "db_endpoint" {
  value = aws_db_instance.main.endpoint
}

output "db_name" {
  value = aws_db_instance.main.db_name
}

output "db_port" {
  value = aws_db_instance.main.port
}

# S3 Buckets for different storage needs
resource "aws_s3_bucket" "raw_pdfs" {
  bucket = "${var.project}-${var.environment}-raw-pdfs"
  
  tags = {
    Name = "${var.project}-${var.environment}-raw-pdfs"
  }
}

resource "aws_s3_bucket" "artifacts" {
  bucket = "${var.project}-${var.environment}-artifacts"
  
  tags = {
    Name = "${var.project}-${var.environment}-artifacts"
  }
}

resource "aws_s3_bucket" "public_cdn" {
  bucket = "${var.project}-${var.environment}-public-cdn"
  
  tags = {
    Name = "${var.project}-${var.environment}-public-cdn"
  }
}

# Bucket versioning
resource "aws_s3_bucket_versioning" "raw_pdfs" {
  bucket = aws_s3_bucket.raw_pdfs.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_versioning" "artifacts" {
  bucket = aws_s3_bucket.artifacts.id
  versioning_configuration {
    status = "Enabled"
  }
}

# Server-side encryption
resource "aws_s3_bucket_server_side_encryption_configuration" "raw_pdfs" {
  bucket = aws_s3_bucket.raw_pdfs.id
  
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "artifacts" {
  bucket = aws_s3_bucket.artifacts.id
  
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# Public access block
resource "aws_s3_bucket_public_access_block" "raw_pdfs" {
  bucket = aws_s3_bucket.raw_pdfs.id
  
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_public_access_block" "artifacts" {
  bucket = aws_s3_bucket.artifacts.id
  
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_public_access_block" "public_cdn" {
  bucket = aws_s3_bucket.public_cdn.id
  
  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

# Lifecycle policies
resource "aws_s3_bucket_lifecycle_configuration" "raw_pdfs" {
  bucket = aws_s3_bucket.raw_pdfs.id
  
  rule {
    id     = "transition_to_ia"
    status = "Enabled"
    
    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }
    
    transition {
      days          = 90
      storage_class = "GLACIER"
    }
    
    expiration {
      days = 2555  # 7 years
    }
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "artifacts" {
  bucket = aws_s3_bucket.artifacts.id
  
  rule {
    id     = "transition_to_ia"
    status = "Enabled"
    
    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }
    
    transition {
      days          = 90
      storage_class = "GLACIER"
    }
    
    expiration {
      days = 365  # 1 year
    }
  }
}

# CORS configuration for public CDN
resource "aws_s3_bucket_cors_configuration" "public_cdn" {
  bucket = aws_s3_bucket.public_cdn.id
  
  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "HEAD"]
    allowed_origins = ["*"]
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
}

# Bucket policies
resource "aws_s3_bucket_policy" "public_cdn" {
  bucket = aws_s3_bucket.public_cdn.id
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "PublicReadGetObject"
        Effect    = "Allow"
        Principal = "*"
        Action    = "s3:GetObject"
        Resource  = "${aws_s3_bucket.public_cdn.arn}/*"
      }
    ]
  })
}

# Outputs
output "raw_pdfs_bucket" {
  value = aws_s3_bucket.raw_pdfs.bucket
}

output "artifacts_bucket" {
  value = aws_s3_bucket.artifacts.bucket
}

output "public_cdn_bucket" {
  value = aws_s3_bucket.public_cdn.bucket
}

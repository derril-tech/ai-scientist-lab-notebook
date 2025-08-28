import { Injectable } from '@nestjs/common';
import { register, Counter, Histogram, Gauge } from 'prom-client';

@Injectable()
export class PrometheusService {
    // Request metrics
    private requestCounter = new Counter({
        name: 'http_requests_total',
        help: 'Total number of HTTP requests',
        labelNames: ['method', 'route', 'status_code'],
    });

    private requestDuration = new Histogram({
        name: 'http_request_duration_seconds',
        help: 'HTTP request duration in seconds',
        labelNames: ['method', 'route'],
        buckets: [0.1, 0.5, 1, 2, 5, 10],
    });

    // Worker metrics
    private workerProcessingTime = new Histogram({
        name: 'worker_processing_duration_seconds',
        help: 'Worker processing duration in seconds',
        labelNames: ['worker_type', 'operation'],
        buckets: [1, 5, 10, 30, 60, 120, 300],
    });

    private workerQueueSize = new Gauge({
        name: 'worker_queue_size',
        help: 'Current queue size for workers',
        labelNames: ['worker_type'],
    });

    private workerErrors = new Counter({
        name: 'worker_errors_total',
        help: 'Total number of worker errors',
        labelNames: ['worker_type', 'error_type'],
    });

    // RAG metrics
    private ragRetrievalRecall = new Histogram({
        name: 'rag_retrieval_recall',
        help: 'RAG retrieval recall scores',
        labelNames: ['question_type'],
        buckets: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0],
    });

    private ragGenerationTime = new Histogram({
        name: 'rag_generation_duration_seconds',
        help: 'RAG answer generation duration',
        labelNames: ['model_type'],
        buckets: [0.5, 1, 2, 5, 10, 20, 30],
    });

    // Document processing metrics
    private documentProcessingTime = new Histogram({
        name: 'document_processing_duration_seconds',
        help: 'Document processing duration',
        labelNames: ['document_type', 'operation'],
        buckets: [5, 10, 30, 60, 120, 300, 600],
    });

    private documentSize = new Histogram({
        name: 'document_size_bytes',
        help: 'Document size in bytes',
        labelNames: ['document_type'],
        buckets: [1024, 10240, 102400, 1048576, 10485760],
    });

    // Database metrics
    private databaseQueryDuration = new Histogram({
        name: 'database_query_duration_seconds',
        help: 'Database query duration',
        labelNames: ['table', 'operation'],
        buckets: [0.001, 0.01, 0.1, 0.5, 1, 2, 5],
    });

    // Cache metrics
    private cacheHitRatio = new Gauge({
        name: 'cache_hit_ratio',
        help: 'Cache hit ratio',
        labelNames: ['cache_type'],
    });

    private cacheSize = new Gauge({
        name: 'cache_size_bytes',
        help: 'Cache size in bytes',
        labelNames: ['cache_type'],
    });

    // Business metrics
    private activeUsers = new Gauge({
        name: 'active_users_total',
        help: 'Total number of active users',
        labelNames: ['workspace_id'],
    });

    private documentsProcessed = new Counter({
        name: 'documents_processed_total',
        help: 'Total number of documents processed',
        labelNames: ['document_type', 'status'],
    });

    private questionsAsked = new Counter({
        name: 'questions_asked_total',
        help: 'Total number of questions asked',
        labelNames: ['question_type'],
    });

    constructor() {
        // Register all metrics
        register.registerMetric(this.requestCounter);
        register.registerMetric(this.requestDuration);
        register.registerMetric(this.workerProcessingTime);
        register.registerMetric(this.workerQueueSize);
        register.registerMetric(this.workerErrors);
        register.registerMetric(this.ragRetrievalRecall);
        register.registerMetric(this.ragGenerationTime);
        register.registerMetric(this.documentProcessingTime);
        register.registerMetric(this.documentSize);
        register.registerMetric(this.databaseQueryDuration);
        register.registerMetric(this.cacheHitRatio);
        register.registerMetric(this.cacheSize);
        register.registerMetric(this.activeUsers);
        register.registerMetric(this.documentsProcessed);
        register.registerMetric(this.questionsAsked);
    }

    // Request tracking
    recordRequest(method: string, route: string, statusCode: number, duration: number): void {
        this.requestCounter.inc({ method, route, status_code: statusCode.toString() });
        this.requestDuration.observe({ method, route }, duration);
    }

    // Worker tracking
    recordWorkerProcessing(workerType: string, operation: string, duration: number): void {
        this.workerProcessingTime.observe({ worker_type: workerType, operation }, duration);
    }

    setWorkerQueueSize(workerType: string, size: number): void {
        this.workerQueueSize.set({ worker_type: workerType }, size);
    }

    recordWorkerError(workerType: string, errorType: string): void {
        this.workerErrors.inc({ worker_type: workerType, error_type: errorType });
    }

    // RAG tracking
    recordRagRetrievalRecall(questionType: string, recall: number): void {
        this.ragRetrievalRecall.observe({ question_type: questionType }, recall);
    }

    recordRagGenerationTime(modelType: string, duration: number): void {
        this.ragGenerationTime.observe({ model_type: modelType }, duration);
    }

    // Document tracking
    recordDocumentProcessing(documentType: string, operation: string, duration: number): void {
        this.documentProcessingTime.observe({ document_type: documentType, operation }, duration);
    }

    recordDocumentSize(documentType: string, size: number): void {
        this.documentSize.observe({ document_type: documentType }, size);
    }

    // Database tracking
    recordDatabaseQuery(table: string, operation: string, duration: number): void {
        this.databaseQueryDuration.observe({ table, operation }, duration);
    }

    // Cache tracking
    setCacheHitRatio(cacheType: string, ratio: number): void {
        this.cacheHitRatio.set({ cache_type: cacheType }, ratio);
    }

    setCacheSize(cacheType: string, size: number): void {
        this.cacheSize.set({ cache_type: cacheType }, size);
    }

    // Business tracking
    setActiveUsers(workspaceId: string, count: number): void {
        this.activeUsers.set({ workspace_id: workspaceId }, count);
    }

    recordDocumentProcessed(documentType: string, status: string): void {
        this.documentsProcessed.inc({ document_type: documentType, status });
    }

    recordQuestionAsked(questionType: string): void {
        this.questionsAsked.inc({ question_type: questionType });
    }

    // Get metrics for Prometheus endpoint
    async getMetrics(): Promise<string> {
        return register.metrics();
    }
}

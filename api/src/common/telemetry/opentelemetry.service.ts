import { Injectable, OnModuleInit } from '@nestjs/common';
import { trace, SpanStatusCode, Span } from '@opentelemetry/api';
import { SemanticAttributes } from '@opentelemetry/semantic-conventions';

@Injectable()
export class OpenTelemetryService implements OnModuleInit {
    private tracer = trace.getTracer('ai-scientist-lab-notebook');

    async onModuleInit() {
        // Initialize OpenTelemetry tracer
    }

    startSpan(name: string, attributes?: Record<string, any>): Span {
        return this.tracer.startSpan(name, {
            attributes: {
                [SemanticAttributes.SERVICE_NAME]: 'ai-scientist-lab-notebook',
                ...attributes,
            },
        });
    }

    async traceAsync<T>(
        name: string,
        fn: (span: Span) => Promise<T>,
        attributes?: Record<string, any>
    ): Promise<T> {
        const span = this.startSpan(name, attributes);

        try {
            const result = await fn(span);
            span.setStatus({ code: SpanStatusCode.OK });
            return result;
        } catch (error) {
            span.setStatus({
                code: SpanStatusCode.ERROR,
                message: error.message,
            });
            span.recordException(error);
            throw error;
        } finally {
            span.end();
        }
    }

    // Specific span methods for different operations
    startPdfParseSpan(documentId: string): Span {
        return this.startSpan('pdf.parse', {
            'document.id': documentId,
            'operation.type': 'parse',
        });
    }

    startTableNormSpan(datasetId: string): Span {
        return this.startSpan('table.norm', {
            'dataset.id': datasetId,
            'operation.type': 'normalize',
        });
    }

    startEmbedUpsertSpan(chunkId: string): Span {
        return this.startSpan('embed.upsert', {
            'chunk.id': chunkId,
            'operation.type': 'embed',
        });
    }

    startRagPlanSpan(questionId: string): Span {
        return this.startSpan('rag.plan', {
            'question.id': questionId,
            'operation.type': 'plan',
        });
    }

    startRagRetrieveSpan(questionId: string): Span {
        return this.startSpan('rag.retrieve', {
            'question.id': questionId,
            'operation.type': 'retrieve',
        });
    }

    startRagGenerateSpan(questionId: string): Span {
        return this.startSpan('rag.generate', {
            'question.id': questionId,
            'operation.type': 'generate',
        });
    }

    startSumMakeSpan(documentId: string): Span {
        return this.startSpan('sum.make', {
            'document.id': documentId,
            'operation.type': 'summarize',
        });
    }

    startPlotRenderSpan(plotId: string): Span {
        return this.startSpan('plot.render', {
            'plot.id': plotId,
            'operation.type': 'render',
        });
    }

    addEvent(span: Span, name: string, attributes?: Record<string, any>): void {
        span.addEvent(name, attributes);
    }

    setAttributes(span: Span, attributes: Record<string, any>): void {
        span.setAttributes(attributes);
    }
}

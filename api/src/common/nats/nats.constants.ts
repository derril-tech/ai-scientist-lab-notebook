export const NATS_SERVICE = 'NATS_SERVICE';

export const NATS_SUBJECTS = {
    DOC_INGEST: 'doc.ingest',
    DOC_CHUNK: 'doc.chunk',
    TABLE_NORM: 'table.norm',
    INDEX_UPSERT: 'index.upsert',
    QA_ASK: 'qa.ask',
    SUM_MAKE: 'sum.make',
    PLOT_MAKE: 'plot.make',
    BUNDLE_MAKE: 'bundle.make',
} as const;

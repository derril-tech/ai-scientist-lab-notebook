import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
    OneToMany,
} from 'typeorm';
import { Document } from '../../documents/entities/document.entity';

@Entity('experiments')
export class Experiment {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'workspace_id', type: 'uuid' })
    workspaceId: string;

    @Column({ name: 'document_id', type: 'uuid' })
    documentId: string;

    @Column()
    title: string;

    @Column('text')
    objective: string;

    @Column('text')
    methodology: string;

    @Column({ name: 'dataset_description', type: 'text' })
    datasetDescription: string;

    @Column({ name: 'key_findings', type: 'json' })
    keyFindings: string[];

    @Column({ type: 'json' })
    limitations: string[];

    @Column({ name: 'confidence_score', type: 'decimal', precision: 3, scale: 2 })
    confidenceScore: number;

    @Column({ name: 'linked_figures', type: 'json' })
    linkedFigures: string[];

    @Column({ name: 'linked_tables', type: 'json' })
    linkedTables: string[];

    @Column({ name: 'linked_citations', type: 'json' })
    linkedCitations: string[];

    @Column({ name: 'span_start_chunk_id', type: 'uuid' })
    spanStartChunkId: string;

    @Column({ name: 'span_end_chunk_id', type: 'uuid' })
    spanEndChunkId: string;

    @Column({ type: 'json' })
    metadata: Record<string, any>;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;

    @ManyToOne(() => Document, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'document_id' })
    document: Document;
}

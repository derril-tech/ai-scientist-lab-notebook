import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';

@Entity('documents')
export class Document {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    workspace_id: string;

    @Column()
    title: string;

    @Column()
    filename: string;

    @Column()
    file_hash: string;

    @Column('bigint')
    file_size: number;

    @Column()
    mime_type: string;

    @Column()
    s3_key: string;

    @Column({ type: 'jsonb', default: {} })
    metadata: Record<string, any>;

    @Column({ default: 'uploaded' })
    status: string;

    @Column({ default: 1 })
    version: number;

    @Column({ nullable: true })
    parent_id: string;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;

    @ManyToOne(() => Document, document => document.id)
    @JoinColumn({ name: 'parent_id' })
    parent: Document;
}

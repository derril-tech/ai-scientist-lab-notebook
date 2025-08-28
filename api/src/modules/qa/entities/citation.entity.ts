import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('citations')
export class Citation {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    answer_id: string;

    @Column({ nullable: true })
    document_id: string;

    @Column({ nullable: true })
    chunk_id: string;

    @Column({ nullable: true })
    figure_id: string;

    @Column({ nullable: true })
    table_id: string;

    @Column({ nullable: true })
    page: number;

    @Column('text', { nullable: true })
    snippet: string;

    @Column('decimal', { precision: 3, scale: 2, nullable: true })
    score: number;

    @CreateDateColumn()
    created_at: Date;
}

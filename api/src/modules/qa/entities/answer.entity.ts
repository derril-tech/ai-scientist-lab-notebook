import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany } from 'typeorm';
import { Citation } from './citation.entity';

@Entity('answers')
export class Answer {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    qa_session_id: string;

    @Column()
    workspace_id: string;

    @Column('text')
    answer: string;

    @Column('decimal', { precision: 3, scale: 2, nullable: true })
    confidence: number;

    @Column({ type: 'jsonb', nullable: true })
    reasoning: Record<string, any>;

    @CreateDateColumn()
    created_at: Date;

    @OneToMany(() => Citation, citation => citation.answer_id)
    citations: Citation[];
}

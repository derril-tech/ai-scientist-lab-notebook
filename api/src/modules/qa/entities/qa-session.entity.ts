import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Answer } from './answer.entity';

@Entity('qa_sessions')
export class QASession {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    workspace_id: string;

    @Column()
    user_id: string;

    @Column('text')
    question: string;

    @Column({ default: 'processing' })
    status: string;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;

    @OneToMany(() => Answer, answer => answer.qa_session_id)
    answers: Answer[];
}

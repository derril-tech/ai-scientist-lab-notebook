import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    Index,
} from 'typeorm';

@Entity('audit_log')
@Index(['org_id', 'created_at'])
@Index(['user_id', 'created_at'])
@Index(['action', 'created_at'])
@Index(['request_id'])
export class AuditLog {
    @PrimaryGeneratedColumn('bigint')
    id: number;

    @Column({ name: 'org_id', type: 'uuid' })
    orgId: string;

    @Column({ name: 'user_id', type: 'uuid' })
    userId: string;

    @Column({ type: 'varchar', length: 100 })
    action: string;

    @Column({ type: 'varchar', length: 255 })
    target: string;

    @Column({ type: 'jsonb', nullable: true })
    meta: any;

    @Column({ name: 'request_id', type: 'varchar', length: 100, nullable: true })
    requestId: string;

    @Column({ name: 'ip_address', type: 'varchar', length: 45, nullable: true })
    ipAddress: string;

    @Column({ name: 'user_agent', type: 'text', nullable: true })
    userAgent: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
}

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
import { User } from '../../auth/entities/user.entity';
import { Workspace } from '../../auth/entities/workspace.entity';

@Entity('datasets')
export class Dataset {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'varchar', length: 255 })
    name: string;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({ type: 'varchar', length: 50 })
    file_type: string; // 'csv', 'xlsx', 'xls'

    @Column({ type: 'varchar', length: 255 })
    filename: string;

    @Column({ type: 'varchar', length: 255 })
    s3_key: string;

    @Column({ type: 'bigint' })
    file_size: number;

    @Column({ type: 'jsonb', nullable: true })
    schema: any; // Column definitions, types, units

    @Column({ type: 'int', default: 0 })
    row_count: number;

    @Column({ type: 'int', default: 0 })
    column_count: number;

    @Column({ type: 'varchar', length: 50, default: 'pending' })
    status: string; // 'pending', 'processing', 'completed', 'failed'

    @Column({ type: 'jsonb', nullable: true })
    metadata: any; // Additional metadata

    @Column({ type: 'uuid' })
    workspace_id: string;

    @Column({ type: 'uuid' })
    created_by: string;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;

    // Relations
    @ManyToOne(() => Workspace, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'workspace_id' })
    workspace: Workspace;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'created_by' })
    creator: User;
}

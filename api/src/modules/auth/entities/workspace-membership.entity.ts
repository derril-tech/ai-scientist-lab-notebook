import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

@Entity('workspace_memberships')
export class WorkspaceMembership {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    workspace_id: string;

    @Column()
    user_id: string;

    @Column({ default: 'member' })
    role: string;

    @Column({ type: 'jsonb', default: {} })
    permissions: Record<string, any>;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;

    @ManyToOne(() => User, user => user.workspace_memberships)
    @JoinColumn({ name: 'user_id' })
    user: User;
}

import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
} from 'typeorm';

@Entity('plots')
export class Plot {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'workspace_id', type: 'uuid' })
    workspaceId: string;

    @Column()
    title: string;

    @Column({ name: 'plot_type' })
    plotType: string;

    @Column({ name: 'data_source' })
    dataSource: string;

    @Column({ name: 'x_column', nullable: true })
    xColumn: string;

    @Column({ name: 'y_column', nullable: true })
    yColumn: string;

    @Column({ name: 'color_column', nullable: true })
    colorColumn: string;

    @Column({ name: 'facet_column', nullable: true })
    facetColumn: string;

    @Column({ type: 'json' })
    transforms: Record<string, any>[];

    @Column({ name: 'error_bars', type: 'json', nullable: true })
    errorBars: Record<string, any>;

    @Column({ name: 'confidence_intervals', type: 'json', nullable: true })
    confidenceIntervals: Record<string, any>;

    @Column({ type: 'json' })
    style: Record<string, any>;

    @Column({ name: 'png_data', type: 'text', nullable: true })
    pngData: string;

    @Column({ name: 'svg_data', type: 'text', nullable: true })
    svgData: string;

    @Column({ name: 'plotly_json', type: 'text', nullable: true })
    plotlyJson: string;

    @Column({ name: 'python_code', type: 'text', nullable: true })
    pythonCode: string;

    @Column({ type: 'json' })
    metadata: Record<string, any>;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}

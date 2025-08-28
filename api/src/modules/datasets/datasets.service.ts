import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Dataset } from './entities/dataset.entity';
import { CreateDatasetDto } from './dto/create-dataset.dto';

@Injectable()
export class DatasetsService {
    constructor(
        @InjectRepository(Dataset)
        private readonly datasetRepository: Repository<Dataset>,
    ) { }

    async create(createDatasetDto: CreateDatasetDto): Promise<Dataset> {
        const dataset = this.datasetRepository.create({
            ...createDatasetDto,
            created_by: createDatasetDto.created_by || 'system',
        });
        return this.datasetRepository.save(dataset);
    }

    async findById(id: string): Promise<Dataset> {
        const dataset = await this.datasetRepository.findOne({
            where: { id },
            relations: ['workspace', 'creator'],
        });

        if (!dataset) {
            throw new NotFoundException(`Dataset with ID ${id} not found`);
        }

        return dataset;
    }

    async findAll(filters: {
        workspace_id?: string;
        status?: string;
        limit?: number;
        offset?: number;
    }): Promise<{ datasets: Dataset[]; total: number }> {
        const queryBuilder = this.datasetRepository
            .createQueryBuilder('dataset')
            .leftJoinAndSelect('dataset.workspace', 'workspace')
            .leftJoinAndSelect('dataset.creator', 'creator');

        if (filters.workspace_id) {
            queryBuilder.andWhere('dataset.workspace_id = :workspaceId', {
                workspaceId: filters.workspace_id,
            });
        }

        if (filters.status) {
            queryBuilder.andWhere('dataset.status = :status', {
                status: filters.status,
            });
        }

        const total = await queryBuilder.getCount();

        const datasets = await queryBuilder
            .orderBy('dataset.created_at', 'DESC')
            .limit(filters.limit || 20)
            .offset(filters.offset || 0)
            .getMany();

        return { datasets, total };
    }

    async update(id: string, updateData: Partial<Dataset>): Promise<Dataset> {
        await this.datasetRepository.update(id, updateData);
        return this.findById(id);
    }

    async delete(id: string): Promise<void> {
        const result = await this.datasetRepository.delete(id);
        if (result.affected === 0) {
            throw new NotFoundException(`Dataset with ID ${id} not found`);
        }
    }

    async getPreview(id: string, limit: number = 100): Promise<any> {
        const dataset = await this.findById(id);

        // This would typically read from the actual data file
        // For now, return metadata about the dataset
        return {
            dataset_id: dataset.id,
            name: dataset.name,
            row_count: dataset.row_count,
            column_count: dataset.column_count,
            schema: dataset.schema,
            preview_limit: limit,
            // In a real implementation, this would read the first N rows from the file
            preview_data: null, // Would contain actual data preview
        };
    }

    async updateStatus(id: string, status: string): Promise<Dataset> {
        return this.update(id, { status });
    }

    async updateSchema(id: string, schema: any): Promise<Dataset> {
        return this.update(id, { schema });
    }
}

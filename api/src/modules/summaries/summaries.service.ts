import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Experiment } from './entities/experiment.entity';
import { NatsService } from '../../common/nats/nats.service';
import { NATS_SUBJECTS } from '../../common/nats/nats.constants';

@Injectable()
export class SummariesService {
    constructor(
        @InjectRepository(Experiment)
        private readonly experimentRepository: Repository<Experiment>,
        private readonly natsService: NatsService,
    ) { }

    async generateExperimentSummaries(documentId: string, workspaceId: string) {
        // Publish NATS event to trigger summary generation
        await this.natsService.publish(NATS_SUBJECTS.SUM_MAKE, {
            documentId,
            workspaceId,
            timestamp: new Date().toISOString(),
        });

        return {
            message: 'Experiment summary generation started',
            documentId,
            workspaceId,
        };
    }

    async listExperimentSummaries(params: {
        workspaceId?: string;
        documentId?: string;
        limit: number;
        offset: number;
    }) {
        const queryBuilder = this.experimentRepository.createQueryBuilder('experiment');

        if (params.workspaceId) {
            queryBuilder.andWhere('experiment.workspaceId = :workspaceId', {
                workspaceId: params.workspaceId,
            });
        }

        if (params.documentId) {
            queryBuilder.andWhere('experiment.documentId = :documentId', {
                documentId: params.documentId,
            });
        }

        const [experiments, total] = await queryBuilder
            .orderBy('experiment.createdAt', 'DESC')
            .skip(params.offset)
            .take(params.limit)
            .getManyAndCount();

        return {
            experiments,
            total,
            limit: params.limit,
            offset: params.offset,
        };
    }

    async getExperimentSummary(id: string) {
        const experiment = await this.experimentRepository.findOne({
            where: { id },
            relations: ['document'],
        });

        if (!experiment) {
            throw new NotFoundException(`Experiment summary with ID ${id} not found`);
        }

        return experiment;
    }

    async createExperimentSummary(experimentData: Partial<Experiment>) {
        const experiment = this.experimentRepository.create(experimentData);
        return this.experimentRepository.save(experiment);
    }

    async updateExperimentSummary(id: string, updateData: Partial<Experiment>) {
        const experiment = await this.experimentRepository.findOne({
            where: { id },
        });

        if (!experiment) {
            throw new NotFoundException(`Experiment summary with ID ${id} not found`);
        }

        Object.assign(experiment, updateData);
        return this.experimentRepository.save(experiment);
    }

    async deleteExperimentSummary(id: string) {
        const experiment = await this.experimentRepository.findOne({
            where: { id },
        });

        if (!experiment) {
            throw new NotFoundException(`Experiment summary with ID ${id} not found`);
        }

        await this.experimentRepository.remove(experiment);
        return { message: 'Experiment summary deleted successfully' };
    }
}

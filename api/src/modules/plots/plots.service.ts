import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Plot } from './entities/plot.entity';
import { CreatePlotDto } from './dto/create-plot.dto';
import { NatsService } from '../../common/nats/nats.service';
import { NATS_SUBJECTS } from '../../common/nats/nats.constants';

@Injectable()
export class PlotsService {
    constructor(
        @InjectRepository(Plot)
        private readonly plotRepository: Repository<Plot>,
        private readonly natsService: NatsService,
    ) { }

    async createPlot(createPlotDto: CreatePlotDto, workspaceId: string) {
        // Create plot record
        const plot = this.plotRepository.create({
            ...createPlotDto,
            workspaceId,
            transforms: createPlotDto.transforms || [],
            style: createPlotDto.style || {},
            metadata: {},
        });

        const savedPlot = await this.plotRepository.save(plot);

        // Publish NATS event to trigger plot generation
        await this.natsService.publish(NATS_SUBJECTS.PLOT_MAKE, {
            plotId: savedPlot.id,
            workspaceId,
            spec: createPlotDto,
            timestamp: new Date().toISOString(),
        });

        return {
            message: 'Plot creation started',
            plotId: savedPlot.id,
            workspaceId,
        };
    }

    async listPlots(params: {
        workspaceId?: string;
        dataSource?: string;
        plotType?: string;
        limit: number;
        offset: number;
    }) {
        const queryBuilder = this.plotRepository.createQueryBuilder('plot');

        if (params.workspaceId) {
            queryBuilder.andWhere('plot.workspaceId = :workspaceId', {
                workspaceId: params.workspaceId,
            });
        }

        if (params.dataSource) {
            queryBuilder.andWhere('plot.dataSource = :dataSource', {
                dataSource: params.dataSource,
            });
        }

        if (params.plotType) {
            queryBuilder.andWhere('plot.plotType = :plotType', {
                plotType: params.plotType,
            });
        }

        const [plots, total] = await queryBuilder
            .orderBy('plot.createdAt', 'DESC')
            .skip(params.offset)
            .take(params.limit)
            .getManyAndCount();

        return {
            plots,
            total,
            limit: params.limit,
            offset: params.offset,
        };
    }

    async getPlot(id: string) {
        const plot = await this.plotRepository.findOne({
            where: { id },
        });

        if (!plot) {
            throw new NotFoundException(`Plot with ID ${id} not found`);
        }

        return plot;
    }

    async getPlotPng(id: string) {
        const plot = await this.plotRepository.findOne({
            where: { id },
            select: ['pngData'],
        });

        if (!plot) {
            throw new NotFoundException(`Plot with ID ${id} not found`);
        }

        if (!plot.pngData) {
            throw new NotFoundException(`PNG data not available for plot ${id}`);
        }

        return {
            data: plot.pngData,
            contentType: 'image/png',
        };
    }

    async getPlotSvg(id: string) {
        const plot = await this.plotRepository.findOne({
            where: { id },
            select: ['svgData'],
        });

        if (!plot) {
            throw new NotFoundException(`Plot with ID ${id} not found`);
        }

        if (!plot.svgData) {
            throw new NotFoundException(`SVG data not available for plot ${id}`);
        }

        return {
            data: plot.svgData,
            contentType: 'image/svg+xml',
        };
    }

    async getPlotCode(id: string) {
        const plot = await this.plotRepository.findOne({
            where: { id },
            select: ['pythonCode'],
        });

        if (!plot) {
            throw new NotFoundException(`Plot with ID ${id} not found`);
        }

        if (!plot.pythonCode) {
            throw new NotFoundException(`Python code not available for plot ${id}`);
        }

        return {
            code: plot.pythonCode,
            language: 'python',
        };
    }

    async updatePlot(id: string, updateData: Partial<Plot>) {
        const plot = await this.plotRepository.findOne({
            where: { id },
        });

        if (!plot) {
            throw new NotFoundException(`Plot with ID ${id} not found`);
        }

        Object.assign(plot, updateData);
        return this.plotRepository.save(plot);
    }

    async deletePlot(id: string) {
        const plot = await this.plotRepository.findOne({
            where: { id },
        });

        if (!plot) {
            throw new NotFoundException(`Plot with ID ${id} not found`);
        }

        await this.plotRepository.remove(plot);
        return { message: 'Plot deleted successfully' };
    }

    async updatePlotRendering(id: string, renderingData: {
        pngData?: string;
        svgData?: string;
        plotlyJson?: string;
        pythonCode?: string;
    }) {
        const plot = await this.plotRepository.findOne({
            where: { id },
        });

        if (!plot) {
            throw new NotFoundException(`Plot with ID ${id} not found`);
        }

        Object.assign(plot, renderingData);
        return this.plotRepository.save(plot);
    }
}

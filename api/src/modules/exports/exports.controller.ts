import {
    Controller,
    Post,
    Get,
    Query,
    UseGuards,
    Res,
    BadRequestException,
    Body,
} from '@nestjs/common';
import { Response } from 'express';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiQuery,
    ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ExportsService } from './exports.service';
import { NatsService } from '../../common/nats/nats.service';
import { NATS_SUBJECTS } from '../../common/nats/nats.constants';

@ApiTags('exports')
@Controller('exports')
@UseGuards(JwtAuthGuard)
export class ExportsController {
    constructor(
        private readonly exportsService: ExportsService,
        private readonly natsService: NatsService,
    ) { }

    @Post('bundles/notebook')
    @ApiOperation({ summary: 'Create a notebook bundle' })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                title: { type: 'string', description: 'Bundle title' },
                document_ids: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Document IDs to include'
                },
                experiment_ids: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Experiment IDs to include'
                },
                plot_ids: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Plot IDs to include'
                },
                format: {
                    type: 'string',
                    enum: ['pdf', 'html', 'markdown'],
                    description: 'Export format'
                },
            },
            required: ['title'],
        },
    })
    @ApiResponse({ status: 201, description: 'Notebook bundle creation started' })
    async createNotebookBundle(@Body() bundleData: any) {
        // Publish to NATS for processing
        await this.natsService.publish(NATS_SUBJECTS.BUNDLE_MAKE, {
            type: 'notebook',
            ...bundleData,
        });

        return {
            message: 'Notebook bundle creation started',
            bundle_id: `bundle-${Date.now()}`,
            status: 'processing',
        };
    }

    @Get('tables.csv')
    @ApiOperation({ summary: 'Export tables as CSV' })
    @ApiQuery({ name: 'document_id', description: 'Document ID', required: false })
    @ApiQuery({ name: 'workspace_id', description: 'Workspace ID', required: false })
    @ApiResponse({ status: 200, description: 'CSV export successful' })
    async exportTablesCSV(
        @Res() res: Response,
        @Query('document_id') documentId?: string,
        @Query('workspace_id') workspaceId?: string,
    ) {
        if (!documentId && !workspaceId) {
            throw new BadRequestException('Either document_id or workspace_id must be provided');
        }

        const csvData = await this.exportsService.exportTablesCSV({
            document_id: documentId,
            workspace_id: workspaceId,
        });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="tables.csv"');
        res.send(csvData);
    }

    @Get('tables.xlsx')
    @ApiOperation({ summary: 'Export tables as XLSX' })
    @ApiQuery({ name: 'document_id', description: 'Document ID', required: false })
    @ApiQuery({ name: 'workspace_id', description: 'Workspace ID', required: false })
    @ApiResponse({ status: 200, description: 'XLSX export successful' })
    async exportTablesXLSX(
        @Res() res: Response,
        @Query('document_id') documentId?: string,
        @Query('workspace_id') workspaceId?: string,
    ) {
        if (!documentId && !workspaceId) {
            throw new BadRequestException('Either document_id or workspace_id must be provided');
        }

        const xlsxBuffer = await this.exportsService.exportTablesXLSX({
            document_id: documentId,
            workspace_id: workspaceId,
        });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename="tables.xlsx"');
        res.send(xlsxBuffer);
    }

    @Get('experiments.csv')
    @ApiOperation({ summary: 'Export experiments as CSV' })
    @ApiQuery({ name: 'document_id', description: 'Document ID', required: false })
    @ApiQuery({ name: 'workspace_id', description: 'Workspace ID', required: false })
    @ApiResponse({ status: 200, description: 'CSV export successful' })
    async exportExperimentsCSV(
        @Res() res: Response,
        @Query('document_id') documentId?: string,
        @Query('workspace_id') workspaceId?: string,
    ) {
        if (!documentId && !workspaceId) {
            throw new BadRequestException('Either document_id or workspace_id must be provided');
        }

        const csvData = await this.exportsService.exportExperimentsCSV({
            document_id: documentId,
            workspace_id: workspaceId,
        });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="experiments.csv"');
        res.send(csvData);
    }
}

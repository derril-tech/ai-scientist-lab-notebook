import {
    Controller,
    Post,
    Get,
    Param,
    Query,
    UseGuards,
    Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SummariesService } from './summaries.service';

@ApiTags('summaries')
@Controller('summaries')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SummariesController {
    constructor(private readonly summariesService: SummariesService) { }

    @Post(':documentId/experiments')
    @ApiOperation({ summary: 'Generate experiment summaries for a document' })
    @ApiResponse({ status: 201, description: 'Experiment summaries generated successfully' })
    @ApiResponse({ status: 404, description: 'Document not found' })
    async generateExperimentSummaries(
        @Param('documentId') documentId: string,
        @Request() req: any,
    ) {
        const workspaceId = req.user.workspaceId;
        return this.summariesService.generateExperimentSummaries(documentId, workspaceId);
    }

    @Get('experiments')
    @ApiOperation({ summary: 'List experiment summaries' })
    @ApiResponse({ status: 200, description: 'Experiment summaries retrieved successfully' })
    async listExperimentSummaries(
        @Query('documentId') documentId?: string,
        @Query('limit') limit = 50,
        @Query('offset') offset = 0,
        @Request() req?: any,
    ) {
        const workspaceId = req?.user?.workspaceId;
        return this.summariesService.listExperimentSummaries({
            workspaceId,
            documentId,
            limit: Number(limit),
            offset: Number(offset),
        });
    }

    @Get('experiments/:id')
    @ApiOperation({ summary: 'Get experiment summary by ID' })
    @ApiResponse({ status: 200, description: 'Experiment summary retrieved successfully' })
    @ApiResponse({ status: 404, description: 'Experiment summary not found' })
    async getExperimentSummary(@Param('id') id: string) {
        return this.summariesService.getExperimentSummary(id);
    }
}

import {
    Controller,
    Post,
    Get,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
    Request,
    Res,
} from '@nestjs/common';
import { Response } from 'express';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DsrService } from './dsr.service';

@ApiTags('dsr')
@Controller('dsr')
@UseGuards(JwtAuthGuard)
export class DsrController {
    constructor(private readonly dsrService: DsrService) { }

    @Post('export')
    @ApiOperation({ summary: 'Export user data (GDPR right to data portability)' })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                format: {
                    type: 'string',
                    enum: ['json', 'csv'],
                    description: 'Export format',
                },
                includeMetadata: {
                    type: 'boolean',
                    description: 'Include metadata in export',
                },
            },
            required: ['format'],
        },
    })
    @ApiResponse({ status: 202, description: 'Data export initiated' })
    async exportUserData(
        @Body() exportRequest: { format: string; includeMetadata?: boolean },
        @Request() req: any,
    ) {
        return this.dsrService.initiateDataExport(req.user.id, exportRequest);
    }

    @Get('export/:exportId')
    @ApiOperation({ summary: 'Get export status and download link' })
    @ApiResponse({ status: 200, description: 'Export status retrieved' })
    async getExportStatus(
        @Param('exportId') exportId: string,
        @Request() req: any,
    ) {
        return this.dsrService.getExportStatus(exportId, req.user.id);
    }

    @Post('delete')
    @ApiOperation({ summary: 'Request account deletion (GDPR right to erasure)' })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                reason: {
                    type: 'string',
                    description: 'Reason for deletion request',
                },
                immediate: {
                    type: 'boolean',
                    description: 'Request immediate deletion',
                },
            },
        },
    })
    @ApiResponse({ status: 202, description: 'Deletion request initiated' })
    async requestDeletion(
        @Body() deletionRequest: { reason?: string; immediate?: boolean },
        @Request() req: any,
    ) {
        return this.dsrService.requestAccountDeletion(req.user.id, deletionRequest);
    }

    @Get('deletion/:requestId')
    @ApiOperation({ summary: 'Get deletion request status' })
    @ApiResponse({ status: 200, description: 'Deletion status retrieved' })
    async getDeletionStatus(
        @Param('requestId') requestId: string,
        @Request() req: any,
    ) {
        return this.dsrService.getDeletionStatus(requestId, req.user.id);
    }

    @Delete('deletion/:requestId/cancel')
    @ApiOperation({ summary: 'Cancel deletion request' })
    @ApiResponse({ status: 200, description: 'Deletion request cancelled' })
    async cancelDeletion(
        @Param('requestId') requestId: string,
        @Request() req: any,
    ) {
        return this.dsrService.cancelDeletionRequest(requestId, req.user.id);
    }

    @Post('rectification')
    @ApiOperation({ summary: 'Request data rectification (GDPR right to rectification)' })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                field: {
                    type: 'string',
                    description: 'Field to rectify',
                },
                currentValue: {
                    type: 'string',
                    description: 'Current value',
                },
                newValue: {
                    type: 'string',
                    description: 'New value',
                },
                reason: {
                    type: 'string',
                    description: 'Reason for rectification',
                },
            },
            required: ['field', 'newValue'],
        },
    })
    @ApiResponse({ status: 202, description: 'Rectification request submitted' })
    async requestRectification(
        @Body() rectificationRequest: {
            field: string;
            currentValue?: string;
            newValue: string;
            reason?: string;
        },
        @Request() req: any,
    ) {
        return this.dsrService.requestDataRectification(req.user.id, rectificationRequest);
    }

    @Get('rectification/:requestId')
    @ApiOperation({ summary: 'Get rectification request status' })
    @ApiResponse({ status: 200, description: 'Rectification status retrieved' })
    async getRectificationStatus(
        @Param('requestId') requestId: string,
        @Request() req: any,
    ) {
        return this.dsrService.getRectificationStatus(requestId, req.user.id);
    }

    @Get('requests')
    @ApiOperation({ summary: 'List all DSR requests for user' })
    @ApiResponse({ status: 200, description: 'DSR requests retrieved' })
    async listDsrRequests(
        @Query('status') status?: string,
        @Query('type') type?: string,
        @Request() req: any,
    ) {
        return this.dsrService.listUserRequests(req.user.id, { status, type });
    }

    @Get('data-summary')
    @ApiOperation({ summary: 'Get summary of user data (GDPR right to information)' })
    @ApiResponse({ status: 200, description: 'Data summary retrieved' })
    async getDataSummary(@Request() req: any) {
        return this.dsrService.getDataSummary(req.user.id);
    }
}

import {
    Controller,
    Post,
    Get,
    Param,
    Body,
    Query,
    UseGuards,
    UseInterceptors,
    UploadedFile,
    BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiConsumes,
    ApiBody,
    ApiParam,
    ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DatasetsService } from './datasets.service';
import { CreateDatasetDto } from './dto/create-dataset.dto';
import { NatsService } from '../../common/nats/nats.service';
import { NatsConstants } from '../../common/nats/nats.constants';

@ApiTags('datasets')
@Controller('datasets')
@UseGuards(JwtAuthGuard)
export class DatasetsController {
    constructor(
        private readonly datasetsService: DatasetsService,
        private readonly natsService: NatsService,
    ) { }

    @Post()
    @ApiOperation({ summary: 'Upload a dataset file' })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                file: {
                    type: 'string',
                    format: 'binary',
                    description: 'Dataset file (CSV, XLSX, XLS)',
                },
                name: {
                    type: 'string',
                    description: 'Dataset name',
                },
                description: {
                    type: 'string',
                    description: 'Dataset description',
                },
                workspace_id: {
                    type: 'string',
                    format: 'uuid',
                    description: 'Workspace ID',
                },
            },
            required: ['file', 'name', 'workspace_id'],
        },
    })
    @ApiResponse({ status: 201, description: 'Dataset uploaded successfully' })
    @ApiResponse({ status: 400, description: 'Invalid file or data' })
    @UseInterceptors(FileInterceptor('file'))
    async uploadDataset(
        @UploadedFile() file: Express.Multer.File,
        @Body() createDatasetDto: CreateDatasetDto,
    ) {
        if (!file) {
            throw new BadRequestException('No file uploaded');
        }

        // Validate file type
        const allowedTypes = ['text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'];
        if (!allowedTypes.includes(file.mimetype)) {
            throw new BadRequestException('Invalid file type. Only CSV, XLSX, and XLS files are allowed');
        }

        // Create dataset record
        const dataset = await this.datasetsService.create({
            ...createDatasetDto,
            file_type: file.mimetype === 'text/csv' ? 'csv' : file.mimetype.includes('openxml') ? 'xlsx' : 'xls',
            filename: file.originalname,
            s3_key: `datasets/${Date.now()}-${file.originalname}`,
            file_size: file.size,
        });

        // Publish to NATS for processing
        await this.natsService.publish(NatsConstants.TABLE_NORM, {
            dataset_id: dataset.id,
            s3_key: dataset.s3_key,
            file_type: dataset.file_type,
        });

        return dataset;
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get dataset by ID' })
    @ApiParam({ name: 'id', description: 'Dataset ID' })
    @ApiResponse({ status: 200, description: 'Dataset retrieved successfully' })
    @ApiResponse({ status: 404, description: 'Dataset not found' })
    async getDataset(@Param('id') id: string) {
        return this.datasetsService.findById(id);
    }

    @Get(':id/preview')
    @ApiOperation({ summary: 'Get dataset preview' })
    @ApiParam({ name: 'id', description: 'Dataset ID' })
    @ApiQuery({ name: 'limit', description: 'Number of rows to preview', required: false, type: Number })
    @ApiResponse({ status: 200, description: 'Dataset preview retrieved successfully' })
    @ApiResponse({ status: 404, description: 'Dataset not found' })
    async getDatasetPreview(
        @Param('id') id: string,
        @Query('limit') limit: number = 100,
    ) {
        return this.datasetsService.getPreview(id, limit);
    }

    @Get()
    @ApiOperation({ summary: 'List datasets' })
    @ApiQuery({ name: 'workspace_id', description: 'Workspace ID', required: false })
    @ApiQuery({ name: 'status', description: 'Filter by status', required: false })
    @ApiQuery({ name: 'limit', description: 'Number of results', required: false, type: Number })
    @ApiQuery({ name: 'offset', description: 'Offset for pagination', required: false, type: Number })
    @ApiResponse({ status: 200, description: 'Datasets retrieved successfully' })
    async listDatasets(
        @Query('workspace_id') workspaceId?: string,
        @Query('status') status?: string,
        @Query('limit') limit: number = 20,
        @Query('offset') offset: number = 0,
    ) {
        return this.datasetsService.findAll({
            workspace_id: workspaceId,
            status,
            limit,
            offset,
        });
    }
}

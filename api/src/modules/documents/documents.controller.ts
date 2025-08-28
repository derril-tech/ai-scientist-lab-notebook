import { Controller, Post, Get, Param, Body, UseGuards, Request, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { DocumentsService } from './documents.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Documents')
@Controller('documents')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DocumentsController {
    constructor(private readonly documentsService: DocumentsService) { }

    @Post()
    @ApiOperation({ summary: 'Upload a new document' })
    @ApiResponse({ status: 201, description: 'Document uploaded successfully' })
    async uploadDocument(@Body() uploadDto: any, @Request() req) {
        return this.documentsService.uploadDocument(uploadDto, req.user.id);
    }

    @Post(':id/reparse')
    @ApiOperation({ summary: 'Reparse a document' })
    @ApiResponse({ status: 200, description: 'Document reparsed successfully' })
    async reparseDocument(@Param('id') id: string, @Request() req) {
        return this.documentsService.reparseDocument(id, req.user.id);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get document by ID' })
    @ApiResponse({ status: 200, description: 'Document retrieved successfully' })
    async getDocument(@Param('id') id: string, @Request() req) {
        return this.documentsService.getDocument(id, req.user.id);
    }

    @Get()
    @ApiOperation({ summary: 'List documents' })
    @ApiResponse({ status: 200, description: 'Documents retrieved successfully' })
    async listDocuments(@Query() query: any, @Request() req) {
        return this.documentsService.listDocuments(query, req.user.id);
    }
}

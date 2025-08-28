import { Controller, Post, Get, Param, Body, UseGuards, Request, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { QAService } from './qa.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Q&A')
@Controller('qa')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class QAController {
    constructor(private readonly qaService: QAService) { }

    @Post()
    @ApiOperation({ summary: 'Ask a question (SSE stream)' })
    @ApiResponse({ status: 200, description: 'Question processing started' })
    async askQuestion(@Body() questionDto: any, @Request() req, @Res() res: Response) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        const sessionId = await this.qaService.createSession(questionDto, req.user.id);

        // TODO: Implement SSE streaming for real-time answer generation
        res.write(`data: ${JSON.stringify({ session_id: sessionId, status: 'processing' })}\n\n`);

        // For now, return a simple response
        res.write(`data: ${JSON.stringify({ answer: 'Answer will be generated...', citations: [] })}\n\n`);
        res.end();
    }

    @Get('answers/:id')
    @ApiOperation({ summary: 'Get answer by ID' })
    @ApiResponse({ status: 200, description: 'Answer retrieved successfully' })
    async getAnswer(@Param('id') id: string, @Request() req) {
        return this.qaService.getAnswer(id, req.user.id);
    }

    @Get('answers/:id/citations')
    @ApiOperation({ summary: 'Get citations for an answer' })
    @ApiResponse({ status: 200, description: 'Citations retrieved successfully' })
    async getCitations(@Param('id') id: string, @Request() req) {
        return this.qaService.getCitations(id, req.user.id);
    }
}

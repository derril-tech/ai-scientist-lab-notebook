import {
    Controller,
    Post,
    Get,
    Param,
    Body,
    Query,
    UseGuards,
    Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PlotsService } from './plots.service';
import { CreatePlotDto } from './dto/create-plot.dto';

@ApiTags('plots')
@Controller('plots')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PlotsController {
    constructor(private readonly plotsService: PlotsService) { }

    @Post()
    @ApiOperation({ summary: 'Create a new plot' })
    @ApiResponse({ status: 201, description: 'Plot created successfully' })
    async createPlot(
        @Body() createPlotDto: CreatePlotDto,
        @Request() req: any,
    ) {
        const workspaceId = req.user.workspaceId;
        return this.plotsService.createPlot(createPlotDto, workspaceId);
    }

    @Get()
    @ApiOperation({ summary: 'List plots' })
    @ApiResponse({ status: 200, description: 'Plots retrieved successfully' })
    async listPlots(
        @Query('dataSource') dataSource?: string,
        @Query('plotType') plotType?: string,
        @Query('limit') limit = 50,
        @Query('offset') offset = 0,
        @Request() req?: any,
    ) {
        const workspaceId = req?.user?.workspaceId;
        return this.plotsService.listPlots({
            workspaceId,
            dataSource,
            plotType,
            limit: Number(limit),
            offset: Number(offset),
        });
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get plot by ID' })
    @ApiResponse({ status: 200, description: 'Plot retrieved successfully' })
    @ApiResponse({ status: 404, description: 'Plot not found' })
    async getPlot(@Param('id') id: string) {
        return this.plotsService.getPlot(id);
    }

    @Get(':id/png')
    @ApiOperation({ summary: 'Get plot as PNG' })
    @ApiResponse({ status: 200, description: 'PNG data retrieved successfully' })
    async getPlotPng(@Param('id') id: string) {
        return this.plotsService.getPlotPng(id);
    }

    @Get(':id/svg')
    @ApiOperation({ summary: 'Get plot as SVG' })
    @ApiResponse({ status: 200, description: 'SVG data retrieved successfully' })
    async getPlotSvg(@Param('id') id: string) {
        return this.plotsService.getPlotSvg(id);
    }

    @Get(':id/code')
    @ApiOperation({ summary: 'Get plot Python code' })
    @ApiResponse({ status: 200, description: 'Python code retrieved successfully' })
    async getPlotCode(@Param('id') id: string) {
        return this.plotsService.getPlotCode(id);
    }
}

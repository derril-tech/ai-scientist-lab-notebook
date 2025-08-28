import { IsString, IsOptional, IsArray, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePlotDto {
    @ApiProperty({ description: 'Plot title' })
    @IsString()
    title: string;

    @ApiProperty({ description: 'Plot type (line, bar, scatter, etc.)' })
    @IsString()
    plotType: string;

    @ApiProperty({ description: 'Data source ID (table or dataset)' })
    @IsString()
    dataSource: string;

    @ApiProperty({ description: 'X-axis column name', required: false })
    @IsOptional()
    @IsString()
    xColumn?: string;

    @ApiProperty({ description: 'Y-axis column name', required: false })
    @IsOptional()
    @IsString()
    yColumn?: string;

    @ApiProperty({ description: 'Color column name', required: false })
    @IsOptional()
    @IsString()
    colorColumn?: string;

    @ApiProperty({ description: 'Facet column name', required: false })
    @IsOptional()
    @IsString()
    facetColumn?: string;

    @ApiProperty({ description: 'Data transforms', required: false })
    @IsOptional()
    @IsArray()
    transforms?: Record<string, any>[];

    @ApiProperty({ description: 'Error bars configuration', required: false })
    @IsOptional()
    @IsObject()
    errorBars?: Record<string, any>;

    @ApiProperty({ description: 'Confidence intervals configuration', required: false })
    @IsOptional()
    @IsObject()
    confidenceIntervals?: Record<string, any>;

    @ApiProperty({ description: 'Plot style configuration', required: false })
    @IsOptional()
    @IsObject()
    style?: Record<string, any>;
}

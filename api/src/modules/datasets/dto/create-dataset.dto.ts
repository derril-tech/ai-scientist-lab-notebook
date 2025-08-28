import { IsString, IsOptional, IsUUID, IsNumber, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDatasetDto {
    @ApiProperty({ description: 'Dataset name' })
    @IsString()
    name: string;

    @ApiPropertyOptional({ description: 'Dataset description' })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiProperty({ description: 'File type (csv, xlsx, xls)' })
    @IsString()
    file_type: string;

    @ApiProperty({ description: 'Original filename' })
    @IsString()
    filename: string;

    @ApiProperty({ description: 'S3 key for the file' })
    @IsString()
    s3_key: string;

    @ApiProperty({ description: 'File size in bytes' })
    @IsNumber()
    file_size: number;

    @ApiProperty({ description: 'Workspace ID' })
    @IsUUID()
    workspace_id: string;

    @ApiPropertyOptional({ description: 'Additional metadata' })
    @IsOptional()
    @IsObject()
    metadata?: any;

    @ApiPropertyOptional({ description: 'Created by user ID' })
    @IsOptional()
    @IsUUID()
    created_by?: string;
}

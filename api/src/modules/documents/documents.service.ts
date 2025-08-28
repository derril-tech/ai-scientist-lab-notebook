import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Document } from './entities/document.entity';
import { HashUtil } from '../../common/utils/hash.util';

@Injectable()
export class DocumentsService {
    constructor(
        @InjectRepository(Document)
        private readonly documentRepository: Repository<Document>,
    ) { }

    async uploadDocument(uploadDto: any, userId: string) {
        // TODO: Implement document upload logic
        // 1. Generate signed URL for S3 upload
        // 2. Emit NATS event for processing
        // 3. Create document record

        const document = this.documentRepository.create({
            workspace_id: uploadDto.workspace_id,
            title: uploadDto.title,
            filename: uploadDto.filename,
            file_hash: uploadDto.file_hash,
            file_size: uploadDto.file_size,
            mime_type: uploadDto.mime_type,
            s3_key: uploadDto.s3_key,
            metadata: uploadDto.metadata || {},
        });

        return this.documentRepository.save(document);
    }

    async reparseDocument(id: string, userId: string) {
        const document = await this.documentRepository.findOne({ where: { id } });

        if (!document) {
            throw new NotFoundException('Document not found');
        }

        // TODO: Emit NATS event for reprocessing
        document.status = 'processing';
        return this.documentRepository.save(document);
    }

    async getDocument(id: string, userId: string) {
        const document = await this.documentRepository.findOne({ where: { id } });

        if (!document) {
            throw new NotFoundException('Document not found');
        }

        return document;
    }

    async listDocuments(query: any, userId: string) {
        const { workspace_id, status, limit = 20, offset = 0 } = query;

        const queryBuilder = this.documentRepository.createQueryBuilder('document');

        if (workspace_id) {
            queryBuilder.where('document.workspace_id = :workspace_id', { workspace_id });
        }

        if (status) {
            queryBuilder.andWhere('document.status = :status', { status });
        }

        queryBuilder
            .orderBy('document.created_at', 'DESC')
            .limit(limit)
            .offset(offset);

        const [documents, total] = await queryBuilder.getManyAndCount();

        return {
            documents,
            total,
            limit,
            offset,
        };
    }
}

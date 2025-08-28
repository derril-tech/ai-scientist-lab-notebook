import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';

@Injectable()
export class AuditService {
    constructor(
        @InjectRepository(AuditLog)
        private readonly auditLogRepository: Repository<AuditLog>,
    ) { }

    async logAction(data: {
        orgId: string;
        userId: string;
        action: string;
        target: string;
        meta?: any;
        requestId?: string;
        ipAddress?: string;
        userAgent?: string;
    }): Promise<void> {
        const auditLog = this.auditLogRepository.create({
            org_id: data.orgId,
            user_id: data.userId,
            action: data.action,
            target: data.target,
            meta: data.meta || {},
            request_id: data.requestId,
            ip_address: data.ipAddress,
            user_agent: data.userAgent,
            created_at: new Date(),
        });

        await this.auditLogRepository.save(auditLog);
    }

    async logDocumentParse(data: {
        orgId: string;
        userId: string;
        documentId: string;
        filename: string;
        fileSize: number;
        parseDuration: number;
        status: 'success' | 'failed';
        error?: string;
        requestId?: string;
    }): Promise<void> {
        await this.logAction({
            orgId: data.orgId,
            userId: data.userId,
            action: 'document.parse',
            target: data.documentId,
            meta: {
                filename: data.filename,
                fileSize: data.fileSize,
                parseDuration: data.parseDuration,
                status: data.status,
                error: data.error,
            },
            requestId: data.requestId,
        });
    }

    async logDocumentEdit(data: {
        orgId: string;
        userId: string;
        documentId: string;
        editType: 'reparse' | 'update' | 'delete';
        changes?: any;
        requestId?: string;
    }): Promise<void> {
        await this.logAction({
            orgId: data.orgId,
            userId: data.userId,
            action: 'document.edit',
            target: data.documentId,
            meta: {
                editType: data.editType,
                changes: data.changes,
            },
            requestId: data.requestId,
        });
    }

    async logExport(data: {
        orgId: string;
        userId: string;
        exportType: 'notebook' | 'csv' | 'xlsx';
        targetIds: string[];
        format: string;
        requestId?: string;
    }): Promise<void> {
        await this.logAction({
            orgId: data.orgId,
            userId: data.userId,
            action: 'export.create',
            target: data.exportType,
            meta: {
                targetIds: data.targetIds,
                format: data.format,
            },
            requestId: data.requestId,
        });
    }

    async logPrompt(data: {
        orgId: string;
        userId: string;
        questionId: string;
        question: string;
        modelType: string;
        responseTime: number;
        tokenCount: number;
        citations: number;
        confidence: number;
        requestId?: string;
    }): Promise<void> {
        await this.logAction({
            orgId: data.orgId,
            userId: data.userId,
            action: 'prompt.ask',
            target: data.questionId,
            meta: {
                question: data.question,
                modelType: data.modelType,
                responseTime: data.responseTime,
                tokenCount: data.tokenCount,
                citations: data.citations,
                confidence: data.confidence,
            },
            requestId: data.requestId,
        });
    }

    async logResponse(data: {
        orgId: string;
        userId: string;
        questionId: string;
        answer: string;
        modelType: string;
        responseTime: number;
        tokenCount: number;
        citations: string[];
        confidence: number;
        requestId?: string;
    }): Promise<void> {
        await this.logAction({
            orgId: data.orgId,
            userId: data.userId,
            action: 'prompt.response',
            target: data.questionId,
            meta: {
                answer: data.answer,
                modelType: data.modelType,
                responseTime: data.responseTime,
                tokenCount: data.tokenCount,
                citations: data.citations,
                confidence: data.confidence,
            },
            requestId: data.requestId,
        });
    }

    async logUserAction(data: {
        orgId: string;
        userId: string;
        action: 'login' | 'logout' | 'password_change' | 'profile_update';
        target: string;
        meta?: any;
        ipAddress?: string;
        userAgent?: string;
    }): Promise<void> {
        await this.logAction({
            orgId: data.orgId,
            userId: data.userId,
            action: `user.${data.action}`,
            target: data.target,
            meta: data.meta,
            ipAddress: data.ipAddress,
            userAgent: data.userAgent,
        });
    }

    async logWorkspaceAction(data: {
        orgId: string;
        userId: string;
        workspaceId: string;
        action: 'create' | 'update' | 'delete' | 'member_add' | 'member_remove';
        target: string;
        meta?: any;
    }): Promise<void> {
        await this.logAction({
            orgId: data.orgId,
            userId: data.userId,
            action: `workspace.${data.action}`,
            target: data.target,
            meta: {
                workspaceId: data.workspaceId,
                ...data.meta,
            },
        });
    }

    async getAuditLogs(filters: {
        orgId?: string;
        userId?: string;
        action?: string;
        target?: string;
        startDate?: Date;
        endDate?: Date;
        limit?: number;
        offset?: number;
    }): Promise<{ logs: AuditLog[]; total: number }> {
        const queryBuilder = this.auditLogRepository.createQueryBuilder('audit_log');

        if (filters.orgId) {
            queryBuilder.andWhere('audit_log.org_id = :orgId', { orgId: filters.orgId });
        }

        if (filters.userId) {
            queryBuilder.andWhere('audit_log.user_id = :userId', { userId: filters.userId });
        }

        if (filters.action) {
            queryBuilder.andWhere('audit_log.action = :action', { action: filters.action });
        }

        if (filters.target) {
            queryBuilder.andWhere('audit_log.target = :target', { target: filters.target });
        }

        if (filters.startDate) {
            queryBuilder.andWhere('audit_log.created_at >= :startDate', { startDate: filters.startDate });
        }

        if (filters.endDate) {
            queryBuilder.andWhere('audit_log.created_at <= :endDate', { endDate: filters.endDate });
        }

        const total = await queryBuilder.getCount();

        const logs = await queryBuilder
            .orderBy('audit_log.created_at', 'DESC')
            .limit(filters.limit || 100)
            .offset(filters.offset || 0)
            .getMany();

        return { logs, total };
    }

    async exportAuditLogs(filters: {
        orgId: string;
        startDate: Date;
        endDate: Date;
    }): Promise<AuditLog[]> {
        return this.auditLogRepository.find({
            where: {
                org_id: filters.orgId,
                created_at: {
                    $gte: filters.startDate,
                    $lte: filters.endDate,
                },
            },
            order: { created_at: 'ASC' },
        });
    }
}

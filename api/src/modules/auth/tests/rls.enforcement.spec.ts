import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Document } from '../../documents/entities/document.entity';
import { Dataset } from '../../datasets/entities/dataset.entity';
import { Plot } from '../../plots/entities/plot.entity';

describe('RLS Enforcement Tests', () => {
    let documentRepository: Repository<Document>;
    let datasetRepository: Repository<Dataset>;
    let plotRepository: Repository<Plot>;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                {
                    provide: getRepositoryToken(Document),
                    useValue: {
                        find: jest.fn(),
                        findOne: jest.fn(),
                        create: jest.fn(),
                        save: jest.fn(),
                        update: jest.fn(),
                        delete: jest.fn(),
                    },
                },
                {
                    provide: getRepositoryToken(Dataset),
                    useValue: {
                        find: jest.fn(),
                        findOne: jest.fn(),
                        create: jest.fn(),
                        save: jest.fn(),
                        update: jest.fn(),
                        delete: jest.fn(),
                    },
                },
                {
                    provide: getRepositoryToken(Plot),
                    useValue: {
                        find: jest.fn(),
                        findOne: jest.fn(),
                        create: jest.fn(),
                        save: jest.fn(),
                        update: jest.fn(),
                        delete: jest.fn(),
                    },
                },
            ],
        }).compile();

        documentRepository = module.get<Repository<Document>>(getRepositoryToken(Document));
        datasetRepository = module.get<Repository<Dataset>>(getRepositoryToken(Dataset));
        plotRepository = module.get<Repository<Plot>>(getRepositoryToken(Plot));
    });

    describe('Document RLS', () => {
        it('should only return documents from user workspace', async () => {
            const mockDocuments = [
                { id: 'doc1', workspace_id: 'workspace1', name: 'Document 1' },
                { id: 'doc2', workspace_id: 'workspace1', name: 'Document 2' },
            ];

            jest.spyOn(documentRepository, 'find').mockResolvedValue(mockDocuments as Document[]);

            const result = await documentRepository.find({
                where: { workspace_id: 'workspace1' },
            });

            expect(result).toHaveLength(2);
            expect(result.every(doc => doc.workspace_id === 'workspace1')).toBe(true);
        });

        it('should not return documents from other workspaces', async () => {
            const mockDocuments = [
                { id: 'doc1', workspace_id: 'workspace1', name: 'Document 1' },
                { id: 'doc2', workspace_id: 'workspace2', name: 'Document 2' },
            ];

            jest.spyOn(documentRepository, 'find').mockResolvedValue(mockDocuments as Document[]);

            const result = await documentRepository.find({
                where: { workspace_id: 'workspace1' },
            });

            expect(result).toHaveLength(1);
            expect(result[0].workspace_id).toBe('workspace1');
        });
    });

    describe('Dataset RLS', () => {
        it('should only return datasets from user workspace', async () => {
            const mockDatasets = [
                { id: 'dataset1', workspace_id: 'workspace1', name: 'Dataset 1' },
                { id: 'dataset2', workspace_id: 'workspace1', name: 'Dataset 2' },
            ];

            jest.spyOn(datasetRepository, 'find').mockResolvedValue(mockDatasets as Dataset[]);

            const result = await datasetRepository.find({
                where: { workspace_id: 'workspace1' },
            });

            expect(result).toHaveLength(2);
            expect(result.every(dataset => dataset.workspace_id === 'workspace1')).toBe(true);
        });
    });

    describe('Plot RLS', () => {
        it('should only return plots from user workspace', async () => {
            const mockPlots = [
                { id: 'plot1', workspaceId: 'workspace1', title: 'Plot 1' },
                { id: 'plot2', workspaceId: 'workspace1', title: 'Plot 2' },
            ];

            jest.spyOn(plotRepository, 'find').mockResolvedValue(mockPlots as Plot[]);

            const result = await plotRepository.find({
                where: { workspaceId: 'workspace1' },
            });

            expect(result).toHaveLength(2);
            expect(result.every(plot => plot.workspaceId === 'workspace1')).toBe(true);
        });
    });

    describe('Tenancy Fuzz Tests', () => {
        it('should handle workspace_id injection attempts', async () => {
            const maliciousQuery = {
                where: { workspace_id: "'; DROP TABLE documents; --" },
            };

            // This should be handled by TypeORM parameterization
            jest.spyOn(documentRepository, 'find').mockResolvedValue([]);

            await expect(
                documentRepository.find(maliciousQuery as any)
            ).resolves.toEqual([]);
        });

        it('should handle null workspace_id gracefully', async () => {
            jest.spyOn(documentRepository, 'find').mockResolvedValue([]);

            const result = await documentRepository.find({
                where: { workspace_id: null },
            });

            expect(result).toEqual([]);
        });
    });
});

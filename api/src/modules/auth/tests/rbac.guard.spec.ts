import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { ExecutionContext } from '@nestjs/common';
import { RBACGuard } from '../guards/rbac.guard';
import { CasbinService } from '../services/casbin.service';

describe('RBACGuard', () => {
    let guard: RBACGuard;
    let reflector: Reflector;
    let casbinService: CasbinService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                RBACGuard,
                {
                    provide: Reflector,
                    useValue: {
                        get: jest.fn(),
                    },
                },
                {
                    provide: CasbinService,
                    useValue: {
                        enforce: jest.fn(),
                    },
                },
            ],
        }).compile();

        guard = module.get<RBACGuard>(RBACGuard);
        reflector = module.get<Reflector>(Reflector);
        casbinService = module.get<CasbinService>(CasbinService);
    });

    it('should be defined', () => {
        expect(guard).toBeDefined();
    });

    it('should allow access when no roles are required', async () => {
        const context = {
            getHandler: () => ({}),
            switchToHttp: () => ({
                getRequest: () => ({
                    user: { id: 'user1' },
                    route: { path: '/api/v1/documents' },
                    method: 'GET',
                }),
            }),
        } as ExecutionContext;

        jest.spyOn(reflector, 'get').mockReturnValue(undefined);

        const result = await guard.canActivate(context);
        expect(result).toBe(true);
    });

    it('should deny access when user is not authenticated', async () => {
        const context = {
            getHandler: () => ({}),
            switchToHttp: () => ({
                getRequest: () => ({
                    user: null,
                    route: { path: '/api/v1/documents' },
                    method: 'GET',
                }),
            }),
        } as ExecutionContext;

        jest.spyOn(reflector, 'get').mockReturnValue(['user']);

        const result = await guard.canActivate(context);
        expect(result).toBe(false);
    });

    it('should allow access when user has required role', async () => {
        const context = {
            getHandler: () => ({}),
            switchToHttp: () => ({
                getRequest: () => ({
                    user: { id: 'user1' },
                    route: { path: '/api/v1/documents' },
                    method: 'GET',
                }),
            }),
        } as ExecutionContext;

        jest.spyOn(reflector, 'get').mockReturnValue(['user']);
        jest.spyOn(casbinService, 'enforce').mockResolvedValue(true);

        const result = await guard.canActivate(context);
        expect(result).toBe(true);
    });

    it('should deny access when user does not have required role', async () => {
        const context = {
            getHandler: () => ({}),
            switchToHttp: () => ({
                getRequest: () => ({
                    user: { id: 'user1' },
                    route: { path: '/api/v1/admin' },
                    method: 'POST',
                }),
            }),
        } as ExecutionContext;

        jest.spyOn(reflector, 'get').mockReturnValue(['admin']);
        jest.spyOn(casbinService, 'enforce').mockResolvedValue(false);

        const result = await guard.canActivate(context);
        expect(result).toBe(false);
    });
});

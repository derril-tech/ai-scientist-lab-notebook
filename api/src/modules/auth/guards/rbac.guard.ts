import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Enforcer } from 'casbin';

@Injectable()
export class RBACGuard implements CanActivate {
    constructor(
        private reflector: Reflector,
        private enforcer: Enforcer,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const requiredRoles = this.reflector.get<string[]>('roles', context.getHandler());
        if (!requiredRoles) {
            return true; // No roles required
        }

        const request = context.switchToHttp().getRequest();
        const user = request.user;

        if (!user) {
            return false;
        }

        // Check each required role
        for (const role of requiredRoles) {
            const hasPermission = await this.enforcer.enforce(
                user.id,
                request.route.path,
                request.method.toLowerCase(),
            );

            if (hasPermission) {
                return true;
            }
        }

        return false;
    }
}

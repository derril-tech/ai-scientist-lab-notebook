import { Injectable, NestMiddleware, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ulid } from 'ulid';

@Injectable()
export class IdempotencyMiddleware implements NestMiddleware {
    use(req: Request, res: Response, next: NextFunction) {
        // Generate Request-ID if not present
        if (!req.headers['x-request-id']) {
            req.headers['x-request-id'] = ulid();
        }

        // Set Request-ID in response headers
        res.setHeader('X-Request-ID', req.headers['x-request-id']);

        // Handle Idempotency-Key for mutation requests
        if (this.isMutationRequest(req.method)) {
            const idempotencyKey = req.headers['idempotency-key'] as string;

            if (!idempotencyKey) {
                throw new HttpException(
                    'Idempotency-Key header is required for mutation requests',
                    HttpStatus.BAD_REQUEST
                );
            }

            // Validate Idempotency-Key format (should be a valid ULID)
            if (!this.isValidUlid(idempotencyKey)) {
                throw new HttpException(
                    'Invalid Idempotency-Key format. Must be a valid ULID.',
                    HttpStatus.BAD_REQUEST
                );
            }

            // TODO: Check Redis for existing idempotency key
            // If exists, return cached response
            // If not, process request and cache response
        }

        next();
    }

    private isMutationRequest(method: string): boolean {
        return ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase());
    }

    private isValidUlid(ulidString: string): boolean {
        // Basic ULID validation (26 characters, alphanumeric)
        const ulidRegex = /^[0-9A-Z]{26}$/;
        return ulidRegex.test(ulidString);
    }
}

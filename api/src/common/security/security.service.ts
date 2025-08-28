import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SecurityService {
    constructor(private configService: ConfigService) { }

    getCorsConfig() {
        const allowedOrigins = this.configService.get<string>('CORS_ALLOWED_ORIGINS', 'http://localhost:3000').split(',');

        return {
            origin: allowedOrigins,
            credentials: true,
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
            allowedHeaders: [
                'Content-Type',
                'Authorization',
                'X-Requested-With',
                'Accept',
                'Origin',
                'Request-ID',
                'Idempotency-Key',
            ],
            exposedHeaders: ['Request-ID'],
            maxAge: 86400, // 24 hours
        };
    }

    getCspConfig() {
        return {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: [
                    "'self'",
                    "'unsafe-inline'", // For Next.js
                    "'unsafe-eval'", // For Next.js development
                ],
                styleSrc: [
                    "'self'",
                    "'unsafe-inline'", // For Tailwind CSS
                    "https://fonts.googleapis.com",
                ],
                fontSrc: [
                    "'self'",
                    "https://fonts.gstatic.com",
                    "data:",
                ],
                imgSrc: [
                    "'self'",
                    "data:",
                    "https:",
                    "blob:",
                ],
                connectSrc: [
                    "'self'",
                    "ws://localhost:3000", // For WebSocket connections
                    "wss://localhost:3000",
                ],
                frameSrc: ["'none'"],
                objectSrc: ["'none'"],
                upgradeInsecureRequests: [],
            },
        };
    }

    getHstsConfig() {
        return {
            maxAge: 31536000, // 1 year
            includeSubDomains: true,
            preload: true,
        };
    }

    getHelmetConfig() {
        return {
            contentSecurityPolicy: this.getCspConfig(),
            hsts: this.getHstsConfig(),
            noSniff: true,
            xssFilter: true,
            frameguard: {
                action: 'deny',
            },
            hidePoweredBy: true,
            referrerPolicy: {
                policy: 'strict-origin-when-cross-origin',
            },
        };
    }

    validateMimeType(mimeType: string, allowedTypes: string[]): boolean {
        return allowedTypes.includes(mimeType);
    }

    sanitizeFilename(filename: string): string {
        // Remove path traversal attempts and other dangerous characters
        return filename
            .replace(/\.\./g, '') // Remove path traversal
            .replace(/[<>:"|?*]/g, '') // Remove invalid characters
            .replace(/^[\/\\]+/, '') // Remove leading slashes
            .substring(0, 255); // Limit length
    }

    validateFileSize(size: number, maxSize: number): boolean {
        return size <= maxSize;
    }

    generateSignedUrl(path: string, expiresIn: number = 3600): string {
        // This would integrate with AWS S3 or similar for signed URLs
        // For now, return a placeholder
        const timestamp = Math.floor(Date.now() / 1000) + expiresIn;
        return `${path}?expires=${timestamp}&signature=placeholder`;
    }

    validateWorkspaceAccess(userId: string, workspaceId: string): boolean {
        // This would check workspace membership
        // For now, return true as placeholder
        return true;
    }

    encryptSensitiveData(data: string): string {
        // This would use KMS or similar encryption
        // For now, return placeholder
        return `encrypted:${data}`;
    }

    decryptSensitiveData(encryptedData: string): string {
        // This would use KMS or similar decryption
        // For now, return placeholder
        return encryptedData.replace('encrypted:', '');
    }
}

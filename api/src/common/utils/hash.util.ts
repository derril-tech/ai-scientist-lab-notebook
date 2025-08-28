import { createHash } from 'crypto';

export class HashUtil {
    /**
     * Generate SHA256 hash for file deduplication
     */
    static generateFileHash(buffer: Buffer): string {
        return createHash('sha256').update(buffer).digest('hex');
    }

    /**
     * Generate hash for content deduplication
     */
    static generateContentHash(content: string): string {
        return createHash('sha256').update(content, 'utf8').digest('hex');
    }

    /**
     * Generate hash for object deduplication
     */
    static generateObjectHash(obj: any): string {
        const sortedString = JSON.stringify(obj, Object.keys(obj).sort());
        return createHash('sha256').update(sortedString, 'utf8').digest('hex');
    }

    /**
     * Generate version hash for lineage tracking
     */
    static generateVersionHash(parentHash: string, changes: any): string {
        const changeString = JSON.stringify(changes, Object.keys(changes).sort());
        return createHash('sha256')
            .update(parentHash + changeString, 'utf8')
            .digest('hex');
    }
}

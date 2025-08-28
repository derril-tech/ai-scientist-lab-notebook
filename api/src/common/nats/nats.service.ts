import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { connect, NatsConnection, StringCodec } from 'nats';
import { NATS_SUBJECTS } from './nats.constants';

@Injectable()
export class NatsService implements OnModuleDestroy {
    private nc: NatsConnection;
    private sc = StringCodec();

    async onModuleInit() {
        this.nc = await connect({
            servers: process.env.NATS_URL || 'nats://localhost:4222',
        });
    }

    async onModuleDestroy() {
        if (this.nc) {
            await this.nc.close();
        }
    }

    async publish(subject: string, data: any) {
        const encoded = this.sc.encode(JSON.stringify(data));
        this.nc.publish(subject, encoded);
    }

    async request(subject: string, data: any, timeout = 5000) {
        const encoded = this.sc.encode(JSON.stringify(data));
        const response = await this.nc.request(subject, encoded, { timeout });
        return JSON.parse(this.sc.decode(response.data));
    }

    async subscribe(subject: string, callback: (data: any) => void) {
        const subscription = this.nc.subscribe(subject);

        for await (const msg of subscription) {
            const data = JSON.parse(this.sc.decode(msg.data));
            callback(data);
        }
    }

    // Convenience methods for specific subjects
    async publishDocIngest(data: any) {
        await this.publish(NATS_SUBJECTS.DOC_INGEST, data);
    }

    async publishQAAsk(data: any) {
        await this.publish(NATS_SUBJECTS.QA_ASK, data);
    }

    async publishSumMake(data: any) {
        await this.publish(NATS_SUBJECTS.SUM_MAKE, data);
    }

    async publishPlotMake(data: any) {
        await this.publish(NATS_SUBJECTS.PLOT_MAKE, data);
    }

    async publishBundleMake(data: any) {
        await this.publish(NATS_SUBJECTS.BUNDLE_MAKE, data);
    }
}

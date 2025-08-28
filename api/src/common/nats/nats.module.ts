import { Module } from '@nestjs/common';
import { NATS_SERVICE } from './nats.constants';
import { NatsService } from './nats.service';

@Module({
    providers: [
        {
            provide: NATS_SERVICE,
            useFactory: () => {
                return new NatsService();
            },
        },
    ],
    exports: [NATS_SERVICE],
})
export class NatsModule { }

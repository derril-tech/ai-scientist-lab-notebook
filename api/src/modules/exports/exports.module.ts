import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExportsController } from './exports.controller';
import { ExportsService } from './exports.service';
import { NatsModule } from '../../common/nats/nats.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([]),
        NatsModule,
    ],
    controllers: [ExportsController],
    providers: [ExportsService],
    exports: [ExportsService],
})
export class ExportsModule { }

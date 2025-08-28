import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatasetsController } from './datasets.controller';
import { DatasetsService } from './datasets.service';
import { Dataset } from './entities/dataset.entity';
import { NatsModule } from '../../common/nats/nats.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Dataset]),
        NatsModule,
    ],
    controllers: [DatasetsController],
    providers: [DatasetsService],
    exports: [DatasetsService],
})
export class DatasetsModule { }

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SummariesController } from './summaries.controller';
import { SummariesService } from './summaries.service';
import { Experiment } from './entities/experiment.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Experiment])],
    controllers: [SummariesController],
    providers: [SummariesService],
    exports: [SummariesService],
})
export class SummariesModule { }

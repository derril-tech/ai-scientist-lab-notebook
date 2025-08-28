import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QAController } from './qa.controller';
import { QAService } from './qa.service';
import { QASession } from './entities/qa-session.entity';
import { Answer } from './entities/answer.entity';
import { Citation } from './entities/citation.entity';

@Module({
    imports: [TypeOrmModule.forFeature([QASession, Answer, Citation])],
    controllers: [QAController],
    providers: [QAService],
    exports: [QAService],
})
export class QAModule { }

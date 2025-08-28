import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QASession } from './entities/qa-session.entity';
import { Answer } from './entities/answer.entity';
import { Citation } from './entities/citation.entity';

@Injectable()
export class QAService {
    constructor(
        @InjectRepository(QASession)
        private readonly qaSessionRepository: Repository<QASession>,
        @InjectRepository(Answer)
        private readonly answerRepository: Repository<Answer>,
        @InjectRepository(Citation)
        private readonly citationRepository: Repository<Citation>,
    ) { }

    async createSession(questionDto: any, userId: string): Promise<string> {
        const session = this.qaSessionRepository.create({
            workspace_id: questionDto.workspace_id,
            user_id: userId,
            question: questionDto.question,
            status: 'processing',
        });

        const savedSession = await this.qaSessionRepository.save(session);

        // TODO: Emit NATS event for RAG processing
        // await this.eventEmitter.emit('qa.ask', { session_id: savedSession.id });

        return savedSession.id;
    }

    async getAnswer(answerId: string, userId: string) {
        const answer = await this.answerRepository.findOne({
            where: { id: answerId },
            relations: ['citations'],
        });

        if (!answer) {
            throw new NotFoundException('Answer not found');
        }

        return answer;
    }

    async getCitations(answerId: string, userId: string) {
        const citations = await this.citationRepository.find({
            where: { answer_id: answerId },
        });

        return citations;
    }
}

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AuthModule } from './modules/auth/auth.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { QAModule } from './modules/qa/qa.module';
import { SummariesModule } from './modules/summaries/summaries.module';
import { PlotsModule } from './modules/plots/plots.module';
import { DatasetsModule } from './modules/datasets/datasets.module';
import { ExportsModule } from './modules/exports/exports.module';
import { MonitoringModule } from './modules/monitoring/monitoring.module';
import { AuditModule } from './modules/audit/audit.module';
import { DsrModule } from './modules/dsr/dsr.module';
import { TelemetryModule } from './common/telemetry/telemetry.module';
import { SecurityModule } from './common/security/security.module';
import { NatsModule } from './common/nats/nats.module';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: ['.env.local', '.env'],
        }),
        TypeOrmModule.forRoot({
            type: 'postgres',
            host: process.env.DB_HOST || 'localhost',
            port: parseInt(process.env.DB_PORT) || 5432,
            username: process.env.DB_USERNAME || 'postgres',
            password: process.env.DB_PASSWORD || 'password',
            database: process.env.DB_NAME || 'ai_scientist_lab_notebook',
            entities: [__dirname + '/**/*.entity{.ts,.js}'],
            synchronize: process.env.NODE_ENV !== 'production',
            logging: process.env.NODE_ENV === 'development',
        }),
        ThrottlerModule.forRoot([
            {
                ttl: 60000,
                limit: 100,
            },
        ]),
        EventEmitterModule.forRoot(),
        NatsModule,
        AuthModule,
        DocumentsModule,
        QAModule,
        SummariesModule,
        PlotsModule,
        DatasetsModule,
        ExportsModule,
        MonitoringModule,
        AuditModule,
        DsrModule,
        TelemetryModule,
        SecurityModule,
    ],
    controllers: [],
    providers: [],
})
export class AppModule { }

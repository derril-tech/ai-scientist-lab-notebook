import { Module } from '@nestjs/common';
import { MonitoringController } from './monitoring.controller';
import { MonitoringModule as CommonMonitoringModule } from '../../common/monitoring/monitoring.module';

@Module({
    imports: [CommonMonitoringModule],
    controllers: [MonitoringController],
})
export class MonitoringModule { }

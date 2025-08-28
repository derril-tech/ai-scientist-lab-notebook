import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';
import { PrometheusService } from '../../common/monitoring/prometheus.service';

@Controller('monitoring')
export class MonitoringController {
    constructor(private readonly prometheusService: PrometheusService) { }

    @Get('metrics')
    async getMetrics(@Res() res: Response) {
        const metrics = await this.prometheusService.getMetrics();
        res.setHeader('Content-Type', 'text/plain');
        res.send(metrics);
    }

    @Get('health')
    async getHealth(@Res() res: Response) {
        res.json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            memory: process.memoryUsage(),
        });
    }

    @Get('ready')
    async getReady(@Res() res: Response) {
        // Add readiness checks here (database, Redis, NATS, etc.)
        res.json({
            status: 'ready',
            timestamp: new Date().toISOString(),
        });
    }
}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlotsController } from './plots.controller';
import { PlotsService } from './plots.service';
import { Plot } from './entities/plot.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Plot])],
    controllers: [PlotsController],
    providers: [PlotsService],
    exports: [PlotsService],
})
export class PlotsModule { }

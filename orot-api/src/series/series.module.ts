import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SeriesService } from './series.service';
import {
  PublicSeriesController,
  StudioSeriesController,
} from './series.controller';

@Module({
  imports: [PrismaModule],
  controllers: [PublicSeriesController, StudioSeriesController],
  providers: [SeriesService],
  exports: [SeriesService],
})
export class SeriesModule {}

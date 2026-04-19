import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AnalyticsService } from './analytics.service';
import {
  AnalyticsController,
  PublicAnalyticsController,
} from './analytics.controller';

@Module({
  imports: [PrismaModule],
  controllers: [PublicAnalyticsController, AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}

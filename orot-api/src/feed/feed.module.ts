import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SettingsModule } from '../settings/settings.module';
import { FeedController } from './feed.controller';

@Module({
  imports: [PrismaModule, SettingsModule],
  controllers: [FeedController],
})
export class FeedModule {}

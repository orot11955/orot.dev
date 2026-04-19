import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SettingsService } from './settings.service';
import {
  PublicSettingsController,
  StudioSettingsController,
} from './settings.controller';

@Module({
  imports: [PrismaModule],
  controllers: [PublicSettingsController, StudioSettingsController],
  providers: [SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}

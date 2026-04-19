import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { GalleryService } from './gallery.service';
import {
  PublicGalleryController,
  StudioGalleryController,
} from './gallery.controller';

@Module({
  imports: [PrismaModule],
  controllers: [PublicGalleryController, StudioGalleryController],
  providers: [GalleryService],
  exports: [GalleryService],
})
export class GalleryModule {}

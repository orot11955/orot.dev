import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CommentsService } from './comments.service';
import {
  PublicCommentsController,
  StudioCommentsController,
} from './comments.controller';

@Module({
  imports: [PrismaModule],
  controllers: [PublicCommentsController, StudioCommentsController],
  providers: [CommentsService],
  exports: [CommentsService],
})
export class CommentsModule {}

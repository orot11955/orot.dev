import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PostsModule } from '../posts/posts.module';
import { SchedulerService } from './scheduler.service';

@Module({
  imports: [PrismaModule, PostsModule],
  providers: [SchedulerService],
})
export class SchedulerModule {}

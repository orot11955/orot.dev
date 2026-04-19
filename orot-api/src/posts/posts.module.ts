import { Module } from '@nestjs/common';
import { PostsService } from './posts.service';
import {
  EditorPostsController,
  PublicPostsController,
  StudioPostsController,
} from './posts.controller';

@Module({
  controllers: [
    PublicPostsController,
    EditorPostsController,
    StudioPostsController,
  ],
  providers: [PostsService],
  exports: [PostsService],
})
export class PostsModule {}

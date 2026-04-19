import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CategoriesService } from './categories.service';
import {
  PublicCategoriesController,
  StudioCategoriesController,
} from './categories.controller';

@Module({
  imports: [PrismaModule],
  controllers: [PublicCategoriesController, StudioCategoriesController],
  providers: [CategoriesService],
  exports: [CategoriesService],
})
export class CategoriesModule {}

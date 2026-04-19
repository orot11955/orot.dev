import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional } from 'class-validator';
import { PostStatus } from '@prisma/client';

export class TransitionPostDto {
  @ApiProperty({ enum: PostStatus })
  @IsEnum(PostStatus)
  status: PostStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;
}

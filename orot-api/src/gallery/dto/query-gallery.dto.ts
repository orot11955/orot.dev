import {
  IsOptional,
  IsInt,
  IsBoolean,
  Min,
  Max,
  IsString,
  IsIn,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';

function transformBoolean({ value }: { value: unknown }) {
  if (value === 'true' || value === true) return true;
  if (value === 'false' || value === false) return false;
  return value;
}

export const GALLERY_SORT_VALUES = [
  'manual',
  'takenAtDesc',
  'takenAtAsc',
  'createdAtDesc',
] as const;

export type GallerySort = (typeof GALLERY_SORT_VALUES)[number];

export class QueryGalleryDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @Transform(transformBoolean)
  @IsBoolean()
  isPublished?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({ required: false, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiProperty({ required: false, default: 24 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ enum: GALLERY_SORT_VALUES, default: 'manual' })
  @IsOptional()
  @IsIn(GALLERY_SORT_VALUES)
  sort?: GallerySort = 'manual';
}

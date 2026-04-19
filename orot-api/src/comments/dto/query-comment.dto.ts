import { IsOptional, IsInt, IsBoolean, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';

function transformBoolean({ value }: { value: unknown }) {
  if (value === 'true' || value === true) return true;
  if (value === 'false' || value === false) return false;
  return value;
}

export class QueryCommentDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  postId?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @Transform(transformBoolean)
  @IsBoolean()
  isApproved?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @Transform(transformBoolean)
  @IsBoolean()
  isFiltered?: boolean;

  @ApiProperty({ required: false, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiProperty({ required: false, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}

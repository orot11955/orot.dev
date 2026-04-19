import {
  IsString,
  IsOptional,
  IsInt,
  MaxLength,
  IsEmail,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateCommentDto {
  @ApiProperty({
    required: false,
    description: 'Parent comment id for replies',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  parentId?: number;

  @ApiProperty()
  @IsString()
  @MaxLength(100)
  authorName: string;

  @ApiProperty()
  @IsEmail()
  @MaxLength(255)
  authorEmail: string;

  @ApiProperty()
  @IsString()
  @MaxLength(2000)
  content: string;
}

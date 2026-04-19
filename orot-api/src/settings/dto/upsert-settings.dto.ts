import { IsArray, IsString, ValidateNested, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class SettingItemDto {
  @ApiProperty()
  @IsString()
  @MaxLength(100)
  key: string;

  @ApiProperty()
  @IsString()
  value: string;
}

export class UpsertSettingsDto {
  @ApiProperty({ type: [SettingItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SettingItemDto)
  settings: SettingItemDto[];
}

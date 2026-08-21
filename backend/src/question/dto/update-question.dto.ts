import { IsOptional, IsString, IsUUID, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateGapDto } from './create-question.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateQuestionDto {
  @ApiPropertyOptional({ description: 'The fill-in-the-gap question text using machine-readable placeholders', example: 'The CPU consists of the {{gap:1}} and {{gap:2}}.' })
  @IsString()
  @IsOptional()
  questionText?: string;

  @ApiPropertyOptional({ description: 'The ID (UUID) of the previous question (set to null to unlink)', example: 'q1b07384-d113-495f-9e67-d0e808160000' })
  @IsUUID(4)
  @IsOptional()
  previousQuestionId?: string;

  @ApiPropertyOptional({ description: 'The list of gap configurations to completely replace the old gaps with', type: [CreateGapDto] })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreateGapDto)
  gaps?: CreateGapDto[];

  @ApiPropertyOptional({ description: 'The ID (UUID) of the topic this question belongs to', example: 't1b07384-d113-495f-9e67-d0e808160000' })
  @IsUUID(4)
  @IsOptional()
  topicId?: string;
}

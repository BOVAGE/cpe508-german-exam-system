import { IsNotEmpty, IsOptional, IsString, IsUUID, IsInt, Min, IsNumber, IsArray, ArrayNotEmpty, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateGapDto {
  @ApiProperty({ description: 'The 1-indexed position matching the placeholder in the question text', example: 1 })
  @IsInt()
  @Min(1)
  position: number;

  @ApiPropertyOptional({ description: 'The score points allocated for this specific gap', default: 1.0, example: 1.0 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  points?: number;

  @ApiProperty({ description: 'The list of correct answers accepted for this gap', type: [String], example: ['Python', 'python'] })
  @IsArray()
  @ArrayNotEmpty({ message: 'Each gap must have at least one accepted answer' })
  @IsString({ each: true })
  acceptedAnswers: string[];
}

export class CreateQuestionDto {
  @ApiProperty({ description: 'The ID (UUID) of the topic this question belongs to', example: 't1b07384-d113-495f-9e67-d0e808160000' })
  @IsUUID(4, { message: 'Topic ID must be a valid UUID' })
  @IsNotEmpty({ message: 'Topic ID is required' })
  topicId: string;

  @ApiProperty({ description: 'The fill-in-the-gap question text using machine-readable placeholders', example: 'The CPU consists of the {{gap:1}} and {{gap:2}}.' })
  @IsString()
  @IsNotEmpty({ message: 'Question text is required' })
  questionText: string;

  @ApiPropertyOptional({ description: 'The ID (UUID) of the previous question this question depends on (for forming linear chains)', example: 'q1b07384-d113-495f-9e67-d0e808160000' })
  @IsUUID(4)
  @IsOptional()
  previousQuestionId?: string;

  @ApiProperty({ description: 'The list of gap configurations matching the placeholders', type: [CreateGapDto] })
  @IsArray()
  @ArrayNotEmpty({ message: 'A question must have at least one gap' })
  @ValidateNested({ each: true })
  @Type(() => CreateGapDto)
  gaps: CreateGapDto[];
}

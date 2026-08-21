import { IsInt, IsNotEmpty, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateExamTopicConfigDto {
  @ApiProperty({ description: 'The number of questions to select randomly from this topic for attempts', minimum: 1, example: 10 })
  @IsInt()
  @Min(1, { message: 'Question count must be at least 1' })
  @IsNotEmpty({ message: 'Question count is required' })
  questionCount: number;
}

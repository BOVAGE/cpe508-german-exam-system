import { IsInt, IsNotEmpty, IsUUID, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateExamTopicConfigDto {
  @ApiProperty({ description: 'The ID (UUID) of the exam', example: 'e1b07384-d113-495f-9e67-d0e808160000' })
  @IsUUID(4, { message: 'Exam ID must be a valid UUID' })
  @IsNotEmpty({ message: 'Exam ID is required' })
  examId: string;

  @ApiProperty({ description: 'The ID (UUID) of the topic to distribute', example: 't1b07384-d113-495f-9e67-d0e808160000' })
  @IsUUID(4, { message: 'Topic ID must be a valid UUID' })
  @IsNotEmpty({ message: 'Topic ID is required' })
  topicId: string;

  @ApiProperty({ description: 'The number of questions to select randomly from this topic for attempts', minimum: 1, example: 5 })
  @IsInt()
  @Min(1, { message: 'Question count must be at least 1' })
  @IsNotEmpty({ message: 'Question count is required' })
  questionCount: number;
}

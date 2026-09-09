import { IsInt, IsNotEmpty, IsString, IsUUID, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SubmitAnswerDto {
  @ApiProperty({
    description: 'The ID (UUID) of the question being answered',
    example: 'q1b07384-d113-495f-9e67-d0e808160000',
  })
  @IsUUID(4, { message: 'Question ID must be a valid UUID' })
  @IsNotEmpty({ message: 'Question ID is required' })
  questionId: string;

  @ApiProperty({
    description: 'The 1-indexed gap position in the question',
    minimum: 1,
    example: 1,
  })
  @IsInt()
  @Min(1, { message: 'Gap position must be at least 1' })
  @IsNotEmpty({ message: 'Gap position is required' })
  gapPosition: number;

  @ApiProperty({
    description: 'The text value of the student answer entry',
    example: 'python',
  })
  @IsString()
  answer: string;
}

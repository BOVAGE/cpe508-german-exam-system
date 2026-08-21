import { IsNotEmpty, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateExamParticipantDto {
  @ApiProperty({ description: 'The ID (UUID) of the exam', example: 'e1b07384-d113-495f-9e67-d0e808160000' })
  @IsUUID(4, { message: 'Exam ID must be a valid UUID' })
  @IsNotEmpty({ message: 'Exam ID is required' })
  examId: string;

  @ApiProperty({ description: 'The ID (UUID) of the student user account to make eligible', example: 's1b07384-d113-495f-9e67-d0e808160000' })
  @IsUUID(4, { message: 'Student ID must be a valid UUID' })
  @IsNotEmpty({ message: 'Student ID is required' })
  studentId: string;
}

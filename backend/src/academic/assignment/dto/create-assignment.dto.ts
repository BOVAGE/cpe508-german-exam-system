import { IsNotEmpty, IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCourseAssignmentDto {
  @ApiProperty({
    description: 'The ID (UUID) of the lecturer user account',
    example: 'a1b07384-d113-495f-9e67-d0e808160000',
  })
  @IsUUID(4, { message: 'Lecturer ID must be a valid UUID' })
  @IsNotEmpty({ message: 'Lecturer ID is required' })
  lecturerId: string;

  @ApiProperty({
    description: 'The ID (UUID) of the course',
    example: 'c1b07384-d113-495f-9e67-d0e808160000',
  })
  @IsUUID(4, { message: 'Course ID must be a valid UUID' })
  @IsNotEmpty({ message: 'Course ID is required' })
  courseId: string;

  @ApiProperty({
    description: 'The academic year session format',
    example: '2025/2026',
  })
  @IsString()
  @IsNotEmpty({ message: 'Academic year is required' })
  academicYear: string;

  @ApiProperty({ description: 'The academic session type', example: 'Rain' })
  @IsString()
  @IsNotEmpty({ message: 'Session is required' })
  session: string;
}

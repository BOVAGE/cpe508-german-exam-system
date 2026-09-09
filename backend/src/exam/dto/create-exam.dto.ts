import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { ExamKind, GradingMode } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateExamDto {
  @ApiProperty({
    description: 'The ID (UUID) of the course this exam belongs to',
    example: 'c1b07384-d113-495f-9e67-d0e808160000',
  })
  @IsUUID(4, { message: 'Course ID must be a valid UUID' })
  @IsNotEmpty({ message: 'Course ID is required' })
  courseId: string;

  @ApiProperty({
    description: 'The title of the examination',
    example: 'Mid-Semester Test',
  })
  @IsString()
  @IsNotEmpty({ message: 'Exam title is required' })
  title: string;

  @ApiPropertyOptional({
    description: 'A brief description of the exam instructions',
    example: 'Answer all questions. Do not refresh the page.',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'The academic year of the exam',
    example: '2025/2026',
  })
  @IsString()
  @IsNotEmpty({ message: 'Academic year is required' })
  academicYear: string;

  @ApiProperty({
    description: 'The academic year session name',
    example: 'Harmattan',
  })
  @IsString()
  @IsNotEmpty({ message: 'Session is required' })
  session: string;

  @ApiProperty({
    description: 'The kind of examination',
    enum: ExamKind,
    example: ExamKind.MID_SEMESTER,
  })
  @IsEnum(ExamKind)
  @IsNotEmpty()
  examKind: ExamKind;

  @ApiProperty({
    description: 'The earliest ISO date-time a student can begin the attempt',
    example: '2026-09-01T08:00:00.000Z',
  })
  @IsDateString()
  @IsNotEmpty()
  scheduledStart: string;

  @ApiProperty({
    description: 'The absolute deadline ISO date-time of the examination',
    example: '2026-09-01T12:00:00.000Z',
  })
  @IsDateString()
  @IsNotEmpty()
  scheduledEnd: string;

  @ApiProperty({
    description:
      'The maximum duration in minutes for an individual student attempt',
    minimum: 1,
    example: 60,
  })
  @IsInt()
  @Min(1)
  @IsNotEmpty()
  duration: number;

  @ApiProperty({
    description: 'The spelling error tolerance grading mode',
    enum: GradingMode,
    example: GradingMode.NON_STRICT,
  })
  @IsEnum(GradingMode)
  @IsNotEmpty()
  gradingMode: GradingMode;
}

import { IsDateString, IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { ExamKind, GradingMode, ExamStatus } from '@prisma/client';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateExamDto {
  @ApiPropertyOptional({ description: 'The title of the examination', example: 'End-of-Semester Examination' })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({ description: 'A brief description of the exam instructions', example: 'Answer all questions.' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'The academic year of the exam', example: '2025/2026' })
  @IsString()
  @IsOptional()
  academicYear?: string;

  @ApiPropertyOptional({ description: 'The academic year session name', example: 'Rain' })
  @IsString()
  @IsOptional()
  session?: string;

  @ApiPropertyOptional({ description: 'The kind of examination', enum: ExamKind, example: ExamKind.END_OF_SEMESTER })
  @IsEnum(ExamKind)
  @IsOptional()
  examKind?: ExamKind;

  @ApiPropertyOptional({ description: 'The earliest ISO date-time a student can begin the attempt', example: '2026-09-01T08:00:00.000Z' })
  @IsDateString()
  @IsOptional()
  scheduledStart?: string;

  @ApiPropertyOptional({ description: 'The absolute deadline ISO date-time of the examination', example: '2026-09-01T12:00:00.000Z' })
  @IsDateString()
  @IsOptional()
  scheduledEnd?: string;

  @ApiPropertyOptional({ description: 'The maximum duration in minutes for an individual student attempt', minimum: 1, example: 90 })
  @IsInt()
  @Min(1)
  @IsOptional()
  duration?: number;

  @ApiPropertyOptional({ description: 'The spelling error tolerance grading mode', enum: GradingMode, example: GradingMode.STRICT })
  @IsEnum(GradingMode)
  @IsOptional()
  gradingMode?: GradingMode;

  @ApiPropertyOptional({ description: 'The status lifecycle state of the exam', enum: ExamStatus, example: ExamStatus.PUBLISHED })
  @IsEnum(ExamStatus)
  @IsOptional()
  status?: ExamStatus;
}

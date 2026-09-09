import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTopicDto {
  @ApiProperty({
    description: 'The ID (UUID) of the parent exam',
    example: 'e1b07384-d113-495f-9e67-d0e808160000',
  })
  @IsUUID(4, { message: 'Exam ID must be a valid UUID' })
  @IsNotEmpty({ message: 'Exam ID is required' })
  examId: string;

  @ApiProperty({
    description: 'The title of the topic',
    example: 'Microprocessor Architecture',
  })
  @IsString()
  @IsNotEmpty({ message: 'Topic title is required' })
  title: string;

  @ApiPropertyOptional({
    description: 'A description of the topic syllabus',
    example: 'Covers CPU cycles, arithmetic logic units, and cache lines.',
  })
  @IsString()
  @IsOptional()
  description?: string;
}

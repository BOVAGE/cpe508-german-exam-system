import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateTopicDto {
  @ApiPropertyOptional({
    description: 'The title of the topic',
    example: 'Microprocessor Architecture',
  })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({
    description: 'A description of the topic syllabus',
    example: 'Covers CPU cycles, ALU, and cache.',
  })
  @IsString()
  @IsOptional()
  description?: string;
}

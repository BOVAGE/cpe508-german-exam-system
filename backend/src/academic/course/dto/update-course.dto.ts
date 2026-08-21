import { IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateCourseDto {
  @ApiPropertyOptional({ description: 'The name of the course', example: 'Microprocessor Systems and Integration' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: 'The unique course code', example: 'CPE 508' })
  @IsString()
  @IsOptional()
  code?: string;

  @ApiPropertyOptional({ description: 'The ID (UUID) of the department offering the course', example: 'b5a07384-d113-495f-9e67-d0e808160000' })
  @IsUUID(4, { message: 'Department ID must be a valid UUID' })
  @IsOptional()
  departmentId?: string;
}

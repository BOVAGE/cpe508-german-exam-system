import { IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateDepartmentDto {
  @ApiPropertyOptional({
    description: 'The name of the department',
    example: 'Computer Engineering',
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    description: 'The unique code of the department',
    example: 'CPE',
  })
  @IsString()
  @IsOptional()
  code?: string;

  @ApiPropertyOptional({
    description: 'The ID (UUID) of the parent faculty',
    example: 'f3b07384-d113-495f-9e67-d0e808160000',
  })
  @IsUUID(4, { message: 'Faculty ID must be a valid UUID' })
  @IsOptional()
  facultyId?: string;
}

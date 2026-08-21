import { IsNotEmpty, IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateDepartmentDto {
  @ApiProperty({ description: 'The name of the department', example: 'Computer Engineering' })
  @IsString()
  @IsNotEmpty({ message: 'Department name is required' })
  name: string;

  @ApiProperty({ description: 'The unique code of the department', example: 'CPE' })
  @IsString()
  @IsNotEmpty({ message: 'Department code is required' })
  code: string;

  @ApiProperty({ description: 'The ID (UUID) of the parent faculty', example: 'f3b07384-d113-495f-9e67-d0e808160000' })
  @IsUUID(4, { message: 'Faculty ID must be a valid UUID' })
  @IsNotEmpty({ message: 'Faculty ID is required' })
  facultyId: string;
}

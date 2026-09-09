import { IsNotEmpty, IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCourseDto {
  @ApiProperty({
    description: 'The name of the course',
    example: 'Microprocessor Systems and Integration',
  })
  @IsString()
  @IsNotEmpty({ message: 'Course name is required' })
  name: string;

  @ApiProperty({ description: 'The unique course code', example: 'CPE 508' })
  @IsString()
  @IsNotEmpty({ message: 'Course code is required' })
  code: string;

  @ApiProperty({
    description: 'The ID (UUID) of the department offering the course',
    example: 'b5a07384-d113-495f-9e67-d0e808160000',
  })
  @IsUUID(4, { message: 'Department ID must be a valid UUID' })
  @IsNotEmpty({ message: 'Department ID is required' })
  departmentId: string;
}

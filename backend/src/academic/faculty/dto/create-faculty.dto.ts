import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateFacultyDto {
  @ApiProperty({
    description: 'The name of the faculty',
    example: 'Faculty of Science and Technology',
  })
  @IsString()
  @IsNotEmpty({ message: 'Faculty name is required' })
  name: string;

  @ApiProperty({
    description: 'The unique code abbreviation of the faculty',
    example: 'SCI_TECH',
  })
  @IsString()
  @IsNotEmpty({ message: 'Faculty code is required' })
  code: string;
}

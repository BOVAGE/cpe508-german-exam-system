import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateFacultyDto {
  @ApiPropertyOptional({
    description: 'The name of the faculty',
    example: 'Faculty of Science and Technology',
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    description: 'The unique code abbreviation of the faculty',
    example: 'SCI_TECH',
  })
  @IsString()
  @IsOptional()
  code?: string;
}

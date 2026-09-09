import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { Role } from '@prisma/client';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUserDto {
  @ApiPropertyOptional({
    description: 'The email address of the user',
    example: 'lecturer@gap.edu',
  })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({
    description: 'The university registration number',
    example: 'CPE/2021/001',
  })
  @IsString()
  @IsOptional()
  registrationNumber?: string;

  @ApiPropertyOptional({
    description: 'The password for the user account (Min length 6)',
    minLength: 6,
    example: 'newpassword123',
  })
  @IsString()
  @IsOptional()
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  password?: string;

  @ApiPropertyOptional({
    description: 'The role of the user',
    enum: Role,
    example: Role.LECTURER,
  })
  @IsEnum(Role)
  @IsOptional()
  role?: Role;

  @ApiPropertyOptional({
    description: 'The first name of the user',
    example: 'John',
  })
  @IsString()
  @IsOptional()
  firstName?: string;

  @ApiPropertyOptional({
    description: 'The last name / surname of the user',
    example: 'Doe',
  })
  @IsString()
  @IsOptional()
  lastName?: string;

  @ApiPropertyOptional({
    description: 'The department ID (UUID)',
    example: 'd3b07384-d113-495f-9e67-d0e808169999',
  })
  @IsString()
  @IsOptional()
  departmentId?: string;
}

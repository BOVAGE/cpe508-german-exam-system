import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    description: 'The email address or student registration number of the user',
    example: 'admin@gap.edu',
  })
  @IsString()
  @IsNotEmpty({ message: 'Email or registration number is required' })
  identifier: string;

  @ApiProperty({
    description: 'The password associated with the user account',
    example: 'adminpassword123',
  })
  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  password: string;
}

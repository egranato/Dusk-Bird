import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { Role } from '../../common/types/role.enum';

export class CreateUserDto {
  @ApiProperty({ example: 'friend@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Alice' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  displayName: string;

  @ApiProperty({ example: 'hunter2', minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiPropertyOptional({ enum: Role, default: Role.User })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;
}

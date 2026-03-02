import { IsString, IsEmail, IsOptional, IsArray } from 'class-validator';

export class CreateClientDto {
  @IsString()
  name: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsArray()
  @IsOptional()
  tags?: string[];

  @IsString()
  workspaceId: string;
}

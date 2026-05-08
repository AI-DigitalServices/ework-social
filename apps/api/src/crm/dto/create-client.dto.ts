import { IsString, IsEmail, IsOptional, IsArray, IsNumber, IsDateString } from 'class-validator';

export class CreateClientDto {
  @IsString()
  name: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  company?: string;

  @IsArray()
  @IsOptional()
  tags?: string[];

  @IsString()
  @IsOptional()
  stage?: string;

  @IsString()
  @IsOptional()
  source?: string;

  @IsNumber()
  @IsOptional()
  dealValue?: number;

  @IsDateString()
  @IsOptional()
  nextFollowUpAt?: string;

  @IsString()
  @IsOptional()
  assignedToId?: string;

  @IsString()
  workspaceId: string;
}

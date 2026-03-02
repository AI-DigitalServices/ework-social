import { IsString, IsOptional, IsArray, IsDateString } from 'class-validator';

export class CreatePostDto {
  @IsString()
  workspaceId: string;

  @IsString()
  socialAccountId: string;

  @IsString()
  content: string;

  @IsArray()
  @IsOptional()
  mediaUrls?: string[];

  @IsDateString()
  @IsOptional()
  scheduledAt?: string;

  @IsString()
  @IsOptional()
  clientId?: string;

  @IsString()
  status: string;
}

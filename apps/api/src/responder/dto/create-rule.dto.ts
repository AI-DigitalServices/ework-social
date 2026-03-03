import { IsString, IsArray, IsOptional, IsBoolean } from 'class-validator';

export class CreateRuleDto {
  @IsString()
  workspaceId: string;

  @IsString()
  name: string;

  @IsString()
  platform: string;

  @IsString()
  triggerType: string;

  @IsArray()
  @IsOptional()
  keywords?: string[];

  @IsString()
  responseMessage: string;

  @IsString()
  @IsOptional()
  responseType?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsString()
  @IsOptional()
  updateLeadStage?: string;
}

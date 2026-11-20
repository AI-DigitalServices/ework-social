import { ArrayMaxSize, ArrayMinSize, IsArray, IsDateString, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class SuggestIdeaDto {
  @IsString()
  @MinLength(3)
  @MaxLength(600)
  idea: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  platform?: string;
}

export class SaveIdeaDto {
  @IsString()
  @MinLength(3)
  @MaxLength(600)
  idea: string;

  @IsString()
  @MinLength(1)
  @MaxLength(3000)
  content: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  platform?: string;
}

export class IdeaToPostDto {
  @IsOptional()
  @IsString()
  socialAccountId?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @IsString({ each: true })
  socialAccountIds?: string[];

  @IsIn(['DRAFT', 'SCHEDULED'])
  status: 'DRAFT' | 'SCHEDULED';

  @IsOptional()
  @IsDateString()
  scheduledAt?: string;
}

export class UpdateIdeaDto {
  @IsString()
  @MinLength(1)
  @MaxLength(3000)
  content: string;
}

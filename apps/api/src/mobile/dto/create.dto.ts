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

  // A photo already uploaded to this workspace's media storage. The posts are written around it.
  @IsOptional()
  @IsString()
  @MaxLength(500)
  imageUrl?: string;

  // Steers a re-write: "make them shorter", "funnier" and so on.
  @IsOptional()
  @IsIn(['SHORTER', 'LONGER', 'FUNNIER', 'MORE_FORMAL', 'MORE_FRIENDLY'])
  hint?: string;

  // What imageUrl shows: a photo, or one frame taken from a video.
  @IsOptional()
  @IsIn(['PHOTO', 'VIDEO'])
  imageKind?: string;
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

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(4)
  @IsString({ each: true })
  @MaxLength(500, { each: true })
  mediaUrls?: string[];
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

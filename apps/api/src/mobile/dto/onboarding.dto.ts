import { IsArray, IsOptional, IsString, MaxLength } from 'class-validator';

// Light shape checks only. The service re-validates every value (known categories, tones,
// frequencies, platforms, website safety) and trims everything, so a bad value is a
// friendly 400 and never reaches the database.

export class AnalyzeWebsiteDto {
  @IsString()
  @MaxLength(200)
  website!: string;
}

export class SaveProfileDto {
  @IsOptional() @IsString() @MaxLength(120) businessName?: string;
  @IsOptional() @IsString() @MaxLength(40) category?: string;
  @IsOptional() @IsString() @MaxLength(200) website?: string;
  @IsOptional() @IsString() @MaxLength(1000) description?: string;
  @IsOptional() @IsString() @MaxLength(500) audience?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) offerings?: string[];
  @IsOptional() @IsString() @MaxLength(20) tone?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) brandColors?: string[];
  @IsOptional() @IsString() @MaxLength(60) language?: string;
  @IsOptional() @IsString() @MaxLength(80) country?: string;
}

export class SavePreferencesDto {
  @IsOptional() @IsString() @MaxLength(20) postingFrequency?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) platforms?: string[];
  @IsOptional() @IsString() @MaxLength(20) tone?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) contentTypes?: string[];
}

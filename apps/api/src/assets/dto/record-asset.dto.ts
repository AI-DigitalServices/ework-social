import { IsString, IsOptional, IsIn, IsNumber } from 'class-validator';

export class RecordAssetDto {
  @IsString()
  url: string;

  @IsString()
  @IsOptional()
  fileName?: string;

  @IsString()
  @IsOptional()
  mimeType?: string;

  @IsNumber()
  @IsOptional()
  sizeBytes?: number;

  @IsIn(['IMAGE', 'VIDEO', 'AUDIO', 'DOCUMENT'])
  kind: 'IMAGE' | 'VIDEO' | 'AUDIO' | 'DOCUMENT';

  @IsString()
  @IsOptional()
  clientId?: string;

  @IsString()
  @IsOptional()
  campaignId?: string;
}

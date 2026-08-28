export class RecordAssetDto {
  url: string;
  fileName?: string;
  mimeType?: string;
  sizeBytes?: number;
  kind: 'IMAGE' | 'VIDEO' | 'AUDIO' | 'DOCUMENT';
  clientId?: string;
  campaignId?: string;
}

import { IsInt, IsString, Matches, MaxLength, Min } from 'class-validator';

export class SignUploadDto {
  @IsString()
  @MaxLength(255)
  fileName: string;

  @IsString()
  @MaxLength(100)
  mimeType: string;

  @IsInt()
  @Min(1)
  sizeBytes: number;

  // Lowercase hex SHA-256 of the file contents, computed by the client.
  @Matches(/^[a-f0-9]{64}$/)
  sha256: string;
}

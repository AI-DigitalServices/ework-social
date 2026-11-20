import { IsIn, IsISO8601, IsOptional, IsString, MaxLength } from 'class-validator';

/** Change a post from the app. Send only what changed. expectedUpdatedAt is the updatedAt the app last saw. */
export class EditPostDto {
  @IsISO8601()
  expectedUpdatedAt!: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  content?: string;

  @IsOptional()
  @IsIn(['DRAFT', 'SCHEDULED'])
  status?: 'DRAFT' | 'SCHEDULED';

  @IsOptional()
  @IsISO8601()
  scheduledAt?: string;
}

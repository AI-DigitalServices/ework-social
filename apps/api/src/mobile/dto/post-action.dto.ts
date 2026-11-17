import { IsISO8601 } from 'class-validator';

/** The app sends the updatedAt it last saw for the post, so stale actions can be refused. */
export class PostActionDto {
  @IsISO8601()
  expectedUpdatedAt!: string;
}

import { IsString } from 'class-validator';

export class UpdateStageDto {
  @IsString()
  stage: string;
}

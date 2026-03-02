import { IsString, IsOptional } from 'class-validator';

export class CreateTaskDto {
  @IsString()
  title: string;

  @IsString()
  @IsOptional()
  dueDate?: string;

  @IsString()
  clientId: string;
}

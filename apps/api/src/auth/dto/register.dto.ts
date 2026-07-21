import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  workspaceName: string;

  /** Present when registering via a workspace invite link — triggers invite-flow registration (no personal workspace created) */
  @IsOptional()
  @IsString()
  inviteToken?: string;
}

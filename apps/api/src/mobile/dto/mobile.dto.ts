import { IsIn, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class SocialLoginDto {
  @IsIn(['google', 'apple'])
  provider!: 'google' | 'apple';

  @IsString()
  @MinLength(20)
  @MaxLength(4096)
  idToken!: string;
}

// Expo push tokens look like ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]
export const EXPO_PUSH_TOKEN = /^Expo(nent)?PushToken\[[A-Za-z0-9_-]{10,64}\]$/;

export class RegisterDeviceDto {
  @IsString()
  @Matches(EXPO_PUSH_TOKEN, { message: 'pushToken must be an Expo push token.' })
  pushToken!: string;

  @IsIn(['android', 'ios'])
  platform!: 'android' | 'ios';

  @IsOptional()
  @IsString()
  @MaxLength(32)
  appVersion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  deviceName?: string;
}

export class UnregisterDeviceDto {
  @IsString()
  @Matches(EXPO_PUSH_TOKEN, { message: 'pushToken must be an Expo push token.' })
  pushToken!: string;
}

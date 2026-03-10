import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    rawBody: true,
  });

  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
  app.enableCors({
    origin: [
      'http://localhost:3000',
      'https://app.eworksocial.com',
      'https://eworksocial.com',
      'https://www.eworksocial.com',
      process.env.FRONTEND_URL,
    ].filter(Boolean),
    credentials: true,
  });

  await app.listen(process.env.PORT || 3001);
  console.log(`API running on port ${process.env.PORT || 3001}`);
}
bootstrap();

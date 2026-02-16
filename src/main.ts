import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import * as cookieParser from 'cookie-parser';
import * as express from 'express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(cookieParser());

  // Serve uploaded files (National IDs etc.) for local/dev usage.
  // In production, prefer object storage (S3) + signed URLs.
  app.use('/uploads', express.static(join(process.cwd(), 'uploads')));

  // Validate request DTOs (helps keep API predictable)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    })
  );

  const allowedOrigin = process.env.CORS_ORIGIN || 'http://localhost:3000';
  app.enableCors({
    origin: allowedOrigin,
    credentials: true,
  });

  const port = parseInt(process.env.PORT || '3001', 10);
  await app.listen(port);
  console.log(`Backend listening on http://localhost:${port}`);
}
bootstrap();

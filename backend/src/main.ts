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

  // CORS (required for Vercel frontend -> Render API)
  const allowedOrigins = [
    "https://app.qr-oo.com",
    "https://workspace-qroo-sys-projects.vercel.app",
    // add your actual Vercel production domain if different:
    // "https://<your-prod-vercel-domain>"
  ];

  app.enableCors({
    origin: (origin, callback) => {
      // allow server-to-server / curl (no Origin header)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) return callback(null, true);

      return callback(new Error(`CORS blocked for origin: ${origin}`), false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  });
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

  // CORS (required for Vercel frontend -> Render API)
   const allowedOrigins = [
    "https://app.qr-oo.com",
    "https://workspace-qroo-sys-projects.vercel.app",
    // add your actual Vercel production domain if different:
    // "https://<your-prod-vercel-domain>"
  ];

  app.enableCors({
    origin: (origin, callback) => {
      // allow server-to-server / curl (no Origin header)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) return callback(null, true);

      return callback(new Error(`CORS blocked for origin: ${origin}`), false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  });

    const port = Number(process.env.PORT) || 3000;
    await app.listen(port);
    console.log(`Backend listening on http://localhost:${port}`);
}
bootstrap();

import "dotenv/config";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { AppModule } from "./app.module";
import * as cookieParser from "cookie-parser";
import * as express from "express";
import { join } from "path";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(cookieParser());

  // ✅ Single, correct CORS config (remove all other enableCors calls)
  const allowedOrigins = [
    "https://app.qr-oo.com",
    "https://workspace-qroo-sys-projects.vercel.app",
    // Add your Vercel production domain if it's different:
    // "https://<your-prod-vercel-domain>",
  ];

  app.enableCors({
    origin: (origin, cb) => {
      // Allow server-to-server, curl, health checks (no Origin header)
      if (!origin) return cb(null, true);

      // Allow only approved browser origins
      if (allowedOrigins.includes(origin)) return cb(null, true);

      // Block everything else
      return cb(null, false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  });

  // Serve uploaded files (National IDs etc.) for local/dev usage.
  // In production, prefer object storage (S3) + signed URLs.
  app.use("/uploads", express.static(join(process.cwd(), "uploads")));

  // Validate request DTOs (helps keep API predictable)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    })
  );

  // ✅ Render/containers: MUST listen on process.env.PORT
  const port = Number(process.env.PORT) || 3000;
  await app.listen(port);
  console.log(`Backend listening on http://localhost:${port}`);
}

bootstrap().catch((err) => {
  console.error("Fatal bootstrap error:", err);
  process.exit(1);
});

import { Controller, Post, UploadedFile, UseInterceptors, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import * as fs from 'fs';
import type { Request } from 'express';

function ensureDir(path: string) {
  if (!fs.existsSync(path)) fs.mkdirSync(path, { recursive: true });
}

@Controller('public/uploads')
export class UploadsController {
  @Post('national-id')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req: Request, _file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
          const dest = join(process.cwd(), 'uploads', 'national-ids');
          ensureDir(dest);
          cb(null, dest);
        },
        filename: (_req: Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
          const safeBase = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
          const stamp = new Date().toISOString().replace(/[:.]/g, '-');
          cb(null, `${stamp}-${safeBase}`);
        },
      }),
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
      // Keep callback signature aligned with Nest/Multer options.
      fileFilter: (_req: Request, file: Express.Multer.File, cb: (error: any, acceptFile: boolean) => void) => {
        const allowed = ['.png', '.jpg', '.jpeg', '.pdf'];
        const ext = extname(file.originalname).toLowerCase();
        if (!allowed.includes(ext)) return cb(new BadRequestException('Only PNG/JPG/PDF allowed') as any, false);
        cb(null, true);
      },
    }),
  )
  async uploadNationalId(@UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file provided');

    // Return a path you can store in DB and later serve via static hosting if desired.
    const relative = `/uploads/national-ids/${file.filename}`;
    return { path: relative, filename: file.filename, size: file.size, mime: file.mimetype };
  }
}

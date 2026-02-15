import { BadRequestException, Controller, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import * as fs from 'fs';

@Controller('public/uploads')
export class UploadsController {
  private readonly uploadDir = join(process.cwd(), 'uploads');

  constructor() {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  @Post('national-id')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req: any, _file: any, cb: any) => cb(null, join(process.cwd(), 'uploads')),
        filename: (_req: any, file: any, cb: any) => {
          const ext = extname(file.originalname || '').toLowerCase();
          const base = String(file.originalname || 'id')
            .replace(ext, '')
            .replace(/[^a-zA-Z0-9-_]/g, '_')
            .slice(0, 50);
          cb(null, `${Date.now()}-${base}${ext || ''}`);
        },
      }),
      limits: { fileSize: 6 * 1024 * 1024 }, // 6MB
      fileFilter: (_req: any, file: any, cb: any) => {
        const ext = extname(file.originalname || '').toLowerCase();
        const allowed = ['.jpg', '.jpeg', '.png', '.pdf'];
        if (!allowed.includes(ext)) return cb(null, false);
        cb(null, true);
      },
    }),
  )
  async uploadNationalId(@UploadedFile() file?: any) {
    if (!file) throw new BadRequestException('No file uploaded (or unsupported file type).');
    return { ok: true, path: `/uploads/${file.filename}` };
  }
}
EOF

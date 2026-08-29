import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';
import { AppError } from '../utils/appError';

// Ensure temporary upload directory exists
if (!fs.existsSync(env.UPLOAD_TEMP_DIR)) {
  fs.mkdirSync(env.UPLOAD_TEMP_DIR, { recursive: true });
}

// Multer Storage engine
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, env.UPLOAD_TEMP_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `doc-${uniqueSuffix}${ext}`);
  },
});

// File filter validation
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const isPdfMime = file.mimetype === 'application/pdf';
  const isPdfExt = ext === '.pdf';

  if (!isPdfMime || !isPdfExt) {
    return cb(new AppError('Invalid file type. Only PDF documents (.pdf) are allowed.', 400));
  }

  cb(null, true);
};

const maxSizeBytes = env.MAX_FILE_SIZE_MB * 1024 * 1024;

const upload = multer({
  storage,
  limits: { fileSize: maxSizeBytes },
  fileFilter,
}).single('file');

export const handleFileUpload = (req: Request, res: Response, next: NextFunction): void => {
  upload(req, res, (err: any) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return next(new AppError(`File size exceeds maximum allowed limit of ${env.MAX_FILE_SIZE_MB}MB.`, 400));
      }
      return next(new AppError(`File upload error: ${err.message}`, 400));
    } else if (err) {
      return next(err);
    }

    if (!req.file) {
      return next(new AppError('No PDF file uploaded. Please attach a file under the key "file".', 400));
    }

    next();
  });
};

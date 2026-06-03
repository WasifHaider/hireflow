import {
  BadRequestException,
  Injectable,
  PipeTransform,
} from '@nestjs/common';

const MAX_RESUME_SIZE_BYTES = 5 * 1024 * 1024;
const PDF_MAGIC_BYTES = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d]); // %PDF-

@Injectable()
export class ResumeFilePipe
  implements PipeTransform<Express.Multer.File, Express.Multer.File>
{
  transform(file: Express.Multer.File | undefined): Express.Multer.File {
    if (!file) {
      throw new BadRequestException('Resume file is required');
    }

    if (file.mimetype !== 'application/pdf') {
      throw new BadRequestException('Resume must be a PDF file');
    }

    if (file.size > MAX_RESUME_SIZE_BYTES) {
      throw new BadRequestException('Resume file must not exceed 5MB');
    }

    if (
      !file.buffer ||
      file.buffer.length < PDF_MAGIC_BYTES.length ||
      !file.buffer.subarray(0, PDF_MAGIC_BYTES.length).equals(PDF_MAGIC_BYTES)
    ) {
      throw new BadRequestException('File content is not a valid PDF');
    }

    return file;
  }
}

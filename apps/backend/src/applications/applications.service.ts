import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { ResumeUrlResponseDto } from './dto/resume-url-response.dto';

const SIGNED_URL_EXPIRES_IN_SECONDS = 300;

@Injectable()
export class ApplicationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
  ) {}

  async getResumeUrl(
    applicationId: string,
    companyId: string,
  ): Promise<ResumeUrlResponseDto> {
    const application = await this.prisma.application.findFirst({
      where: { id: applicationId, companyId },
      select: { resumeUrl: true },
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    if (!application.resumeUrl) {
      throw new NotFoundException('No resume on file');
    }

    const signedUrl = await this.storageService.getSignedUrl(
      application.resumeUrl,
      SIGNED_URL_EXPIRES_IN_SECONDS,
    );

    return {
      signedUrl,
      expiresIn: SIGNED_URL_EXPIRES_IN_SECONDS,
    };
  }
}

import {
  BadRequestException,
  Injectable,
  PipeTransform,
} from '@nestjs/common';

const COMPANY_SLUG_PATTERN = /^[a-z0-9-]+$/;

@Injectable()
export class CompanySlugPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (
      typeof value !== 'string' ||
      value.length < 2 ||
      value.length > 50 ||
      !COMPANY_SLUG_PATTERN.test(value)
    ) {
      throw new BadRequestException(
        'companySlug must be 2–50 characters and contain only lowercase letters, numbers, and hyphens',
      );
    }
    return value;
  }
}

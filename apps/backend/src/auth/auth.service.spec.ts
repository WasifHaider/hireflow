import { ConflictException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AuthService.updateCompany', () => {
  let service: AuthService;
  let prisma: {
    company: { findUnique: jest.Mock; update: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      company: { findUnique: jest.fn(), update: jest.fn() },
    };
    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: { sign: jest.fn() } },
      ],
    }).compile();
    service = moduleRef.get(AuthService);
  });

  it('updates the company name only when slug is omitted', async () => {
    prisma.company.update.mockResolvedValue({ id: 'company-1', name: 'New Name', slug: 'acme' });

    const result = await service.updateCompany('company-1', { companyName: 'New Name' });

    expect(prisma.company.findUnique).not.toHaveBeenCalled();
    expect(prisma.company.update).toHaveBeenCalledWith({
      where: { id: 'company-1' },
      data: { name: 'New Name' },
    });
    expect(result.name).toBe('New Name');
  });

  it('updates the slug when it is free', async () => {
    prisma.company.findUnique.mockResolvedValue(null);
    prisma.company.update.mockResolvedValue({ id: 'company-1', name: 'Acme', slug: 'new-slug' });

    const result = await service.updateCompany('company-1', { slug: 'new-slug' });

    expect(prisma.company.update).toHaveBeenCalledWith({
      where: { id: 'company-1' },
      data: { slug: 'new-slug' },
    });
    expect(result.slug).toBe('new-slug');
  });

  it('throws 409 when the slug belongs to a different company', async () => {
    prisma.company.findUnique.mockResolvedValue({ id: 'other-company', slug: 'taken' });

    await expect(service.updateCompany('company-1', { slug: 'taken' })).rejects.toThrow(
      ConflictException,
    );
    expect(prisma.company.update).not.toHaveBeenCalled();
  });

  it('allows re-saving the same slug the company already owns', async () => {
    prisma.company.findUnique.mockResolvedValue({ id: 'company-1', slug: 'acme' });
    prisma.company.update.mockResolvedValue({ id: 'company-1', name: 'Acme', slug: 'acme' });

    const result = await service.updateCompany('company-1', { slug: 'acme' });

    expect(result.slug).toBe('acme');
  });
});

describe('AuthService.isSlugAvailable', () => {
  let service: AuthService;
  let prisma: { company: { findUnique: jest.Mock } };

  beforeEach(async () => {
    prisma = { company: { findUnique: jest.fn() } };
    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: { sign: jest.fn() } },
      ],
    }).compile();
    service = moduleRef.get(AuthService);
  });

  it('returns true when no company owns the slug', async () => {
    prisma.company.findUnique.mockResolvedValue(null);
    await expect(service.isSlugAvailable('free-slug')).resolves.toBe(true);
  });

  it('returns false when a different company owns the slug', async () => {
    prisma.company.findUnique.mockResolvedValue({ id: 'other-company', slug: 'taken' });
    await expect(service.isSlugAvailable('taken', 'company-1')).resolves.toBe(false);
  });

  it('returns true when the requesting company owns the slug itself', async () => {
    prisma.company.findUnique.mockResolvedValue({ id: 'company-1', slug: 'mine' });
    await expect(service.isSlugAvailable('mine', 'company-1')).resolves.toBe(true);
  });
});

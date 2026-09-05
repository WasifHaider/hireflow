import { BadGatewayException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { of, throwError } from 'rxjs';
import { AiService } from './ai.service';

describe('AiService.generateJobDescription', () => {
  let service: AiService;
  let http: { post: jest.Mock };

  beforeEach(async () => {
    http = { post: jest.fn() };
    const moduleRef = await Test.createTestingModule({
      providers: [
        AiService,
        { provide: HttpService, useValue: http },
        { provide: ConfigService, useValue: { getOrThrow: () => 'test-key' } },
      ],
    }).compile();
    service = moduleRef.get(AiService);
  });

  it('parses a well-formed Groq JSON response', async () => {
    const payload = {
      description: 'We are looking for a great engineer.',
      requirements: '- 5+ years experience\n- Node.js',
      mustHaveSkills: ['Node.js', 'PostgreSQL'],
    };
    http.post.mockReturnValue(
      of({ data: { choices: [{ message: { content: JSON.stringify(payload) } }] } }),
    );

    const result = await service.generateJobDescription({ title: 'Backend Engineer' });

    expect(result).toEqual(payload);
  });

  it('drops non-string entries from mustHaveSkills defensively', async () => {
    const payload = {
      description: 'Desc',
      requirements: 'Reqs',
      mustHaveSkills: ['Node.js', 42, null],
    };
    http.post.mockReturnValue(
      of({ data: { choices: [{ message: { content: JSON.stringify(payload) } }] } }),
    );

    const result = await service.generateJobDescription({ title: 'Backend Engineer' });

    expect(result.mustHaveSkills).toEqual(['Node.js']);
  });

  it('throws 502 when Groq returns non-JSON content', async () => {
    http.post.mockReturnValue(
      of({ data: { choices: [{ message: { content: 'not json at all' } }] } }),
    );

    await expect(service.generateJobDescription({ title: 'Backend Engineer' })).rejects.toThrow(
      BadGatewayException,
    );
  });

  it('throws 502 when Groq JSON is missing expected keys', async () => {
    http.post.mockReturnValue(
      of({ data: { choices: [{ message: { content: JSON.stringify({ foo: 'bar' }) } }] } }),
    );

    await expect(service.generateJobDescription({ title: 'Backend Engineer' })).rejects.toThrow(
      BadGatewayException,
    );
  });

  it('throws 502 when the Groq HTTP call itself fails', async () => {
    http.post.mockReturnValue(throwError(() => new Error('network error')));

    await expect(service.generateJobDescription({ title: 'Backend Engineer' })).rejects.toThrow(
      BadGatewayException,
    );
  });
});

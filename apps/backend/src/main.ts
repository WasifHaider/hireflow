import { createBullBoard } from '@bull-board/api';
import { BullAdapter } from '@bull-board/api/bullAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { getQueueToken } from '@nestjs/bull';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';
import { APPLICATION_SCORING_QUEUE } from './queues/application-scoring/application-scoring.constants';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const prismaService = app.get(PrismaService);
  prismaService.enableShutdownHooks(app);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // SECURITY: bull-board exposes job payloads (PII). Protect with auth in production.
  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath('/api/queues');

  const scoringQueue = app.get(getQueueToken(APPLICATION_SCORING_QUEUE));
  createBullBoard({
    queues: [new BullAdapter(scoringQueue)],
    serverAdapter,
  });

  app.use('/api/queues', serverAdapter.getRouter());

  app.enableCors({
    origin: 'http://localhost:9173',
    credentials: true,
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('HireFlow API')
    .setDescription('Multi-tenant hiring platform API')
    .setVersion('1.0')
    .addBearerAuth({
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
    })
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(3200);
}
bootstrap();

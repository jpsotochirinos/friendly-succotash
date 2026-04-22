import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { getAllowedCorsOrigins } from './common/cors-origins';
import { ImportService } from './modules/import/import.service';
import { mountTusImport } from './modules/import/tus.bridge';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.useBodyParser('json', {
    limit: '2mb',
    verify: (req: any, _res: unknown, buf: Buffer) => {
      req.rawBody = buf;
    },
  });
  app.useBodyParser('urlencoded', {
    extended: true,
    limit: '2mb',
    verify: (req: any, _res: unknown, buf: Buffer) => {
      req.rawBody = buf;
    },
  });

  app.use(helmet());
  app.use(cookieParser());
  app.enableCors({
    origin: getAllowedCorsOrigins(),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Tus-Resumable',
      'Upload-Length',
      'Upload-Metadata',
      'Upload-Offset',
      'Upload-Defer-Length',
      'Upload-Concat',
    ],
    exposedHeaders: [
      'Location',
      'Upload-Offset',
      'Upload-Length',
      'Tus-Resumable',
      'Upload-Metadata',
    ],
  });

  /** TUS runs as raw Express middleware before Nest `api` routes so PATCH bodies are not consumed by JSON parsers. */
  const importService = app.get(ImportService);
  await mountTusImport(app, importService);

  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = process.env.APP_PORT || 3000;
  await app.listen(port);
  console.log(`API running on http://localhost:${port}/api`);
}

bootstrap();

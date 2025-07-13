import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { LoggerService } from './common/services/logger.service';
import { ConfigurationService } from './common/configuration/configuration.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const loggerService = app.get(LoggerService);

  app.enableCors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept',
      'Origin',
      'X-Requested-With',
    ],
  });

  const config = new DocumentBuilder()
    .setTitle('WhatHub Gateway API')
    .setDescription('Documentación de la API RESTful de WhatHub Gateway')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('', app, document);

  const port = app.get(ConfigurationService).getPort();
  await app.listen(port);

  loggerService.success(
    `Release v1 - RESTful API corriendo en el puerto: ${port}`,
    'Bootstrap',
  );
}
bootstrap();

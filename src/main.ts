import 'dotenv/config';
import * as colors from 'colors';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Habilitar CORS para todos los orígenes
  app.enableCors({
    origin: true, // Permite todos los orígenes
    credentials: true, // Permite cookies y headers de autenticación
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept',
      'Origin',
      'X-Requested-With',
    ],
  });

  // Swagger setup
  const config = new DocumentBuilder()
    .setTitle('WhatHub Gateway API')
    .setDescription('Documentación de la API RESTful de WhatHub Gateway')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('', app, document);

  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  const brand =
    colors.bgBlue.white.bold(' WhatHub ') +
    colors.bgGreen.white.bold(' GateWay ');
  const msg =
    colors.green('Release v1 - RESTful API corriendo en el puerto: ') +
    colors.blue(port.toString());
  console.log('\n' + brand + '\n' + msg + '\n');
}
bootstrap();

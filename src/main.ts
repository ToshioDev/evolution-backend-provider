import 'dotenv/config';
import * as colors from 'colors';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

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

  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  const brand =
    colors.bgBlue.white.bold(' WhatHub ') +
    colors.bgGreen.white.bold(' GateWay ');
  const msg =
    colors.green('RESTful API corriendo en el puerto: ') +
    colors.blue(port.toString());
  console.log('\n' + brand + '\n' + msg + '\n');
}
bootstrap();

import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
require('colors');

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  // Branding y log colorido
  // @ts-ignore
  const brand = ' WhatHub '.bgBlue.white.bold + ' GateWay '.bgGreen.white.bold;
  // @ts-ignore
  const msg = 'RESTful API corriendo en el puerto: '.green + port.toString().blue;
  console.log('\n' + brand + '\n' + msg + '\n');
}
bootstrap();

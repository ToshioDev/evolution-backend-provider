import 'dotenv/config';
import * as colors from 'colors';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
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

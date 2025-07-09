import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {

  @Get('live')
  getLive(): { pong: boolean; latency: number } {
    const start = Date.now();
    // Simulación de pequeña operación para medir latencia real del handler
    const latency = Date.now() - start;
    return { pong: true, latency };
  }
}

import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get('live')
  getLive(): { pong: boolean; latency: number } {
    const start = Date.now();
    const latency = Date.now() - start;
    return { pong: true, latency };
  }
}

import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { Injectable, Logger } from '@nestjs/common';
import { MessageService } from './message.service';

@Processor('message-queue')
@Injectable()
export class MessageProcessor {
  private readonly logger = new Logger(MessageProcessor.name);

  constructor(private readonly messageService: MessageService) {}

  @Process('send-message')
  async handleSendMessage(job: Job<any>) {
    const data = job.data;
    this.logger.log(`Procesando mensaje en worker. messageId: ${data.messageId || 'N/A'}`);
    try {
      await this.messageService.processAndSendMessage(data);
      this.logger.log(`Mensaje procesado y enviado correctamente. messageId: ${data.messageId || 'N/A'}`);
    } catch (error) {
      this.logger.error(`Error procesando mensaje en worker: ${error.message}`, error.stack);
      throw error;
    }
  }
}

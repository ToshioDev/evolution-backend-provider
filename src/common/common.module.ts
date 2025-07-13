import { Global, Module } from '@nestjs/common';
import { LoggerService } from './services/logger.service';
import { ConfigurationService } from './configuration/configuration.service';

@Global()
@Module({
  providers: [LoggerService, ConfigurationService],
  exports: [LoggerService, ConfigurationService],
})
export class CommonModule {}

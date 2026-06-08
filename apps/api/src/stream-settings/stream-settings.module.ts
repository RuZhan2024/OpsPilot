import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { StreamSettingsController } from './stream-settings.controller';
import { StreamSettingsService } from './stream-settings.service';

@Module({
  imports: [PrismaModule],
  controllers: [StreamSettingsController],
  providers: [StreamSettingsService],
})
export class StreamSettingsModule {}

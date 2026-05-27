import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AudienceModule } from './audience/audience.module';
import { AuthModule } from './auth/auth.module';
import { EventsModule } from './events/events.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [PrismaModule, AuthModule, EventsModule, AudienceModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

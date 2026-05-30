import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AnalyticsModule } from './analytics/analytics.module';
import { AudienceModule } from './audience/audience.module';
import { AuthModule } from './auth/auth.module';
import { ContentModulesModule } from './content-modules/content-modules.module';
import { EventsModule } from './events/events.module';
import { PrismaModule } from './prisma/prisma.module';
import { RecommendationsModule } from './recommendations/recommendations.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    EventsModule,
    AudienceModule,
    ContentModulesModule,
    AnalyticsModule,
    RecommendationsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AnalyticsModule } from './analytics/analytics.module';
import { AuditLogsModule } from './audit-logs/audit-logs.module';
import { AudienceModule } from './audience/audience.module';
import { AuthModule } from './auth/auth.module';
import { ContentModulesModule } from './content-modules/content-modules.module';
import { EngagementModule } from './engagement/engagement.module';
import { EventsModule } from './events/events.module';
import { MediaAssetsModule } from './media-assets/media-assets.module';
import { PrismaModule } from './prisma/prisma.module';
import { RecommendationsModule } from './recommendations/recommendations.module';
import { StreamSettingsModule } from './stream-settings/stream-settings.module';
import { UsersModule } from './users/users.module';
import { WorkspacesModule } from './workspaces/workspaces.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    EventsModule,
    AudienceModule,
    ContentModulesModule,
    EngagementModule,
    MediaAssetsModule,
    AnalyticsModule,
    RecommendationsModule,
    StreamSettingsModule,
    AuditLogsModule,
    UsersModule,
    WorkspacesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

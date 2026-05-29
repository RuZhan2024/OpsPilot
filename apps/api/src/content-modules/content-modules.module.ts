import { Module } from '@nestjs/common';
import { ContentModulesController } from './content-modules.controller';
import { ContentModulesService } from './content-modules.service';

@Module({
  controllers: [ContentModulesController],
  providers: [ContentModulesService],
})
export class ContentModulesModule {}

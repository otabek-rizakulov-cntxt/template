import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { EnvironmentConfigService } from './environment-config.service';

/**
 * Provides the typed config adapter only.
 *
 * `ConfigModule.forRoot()` — which loads .env and runs schema validation — is
 * called exactly once, in AppModule. Calling it here as well meant validation
 * ran as an import side-effect of any module that touched config, which made
 * those modules impossible to load in a test without a full environment.
 */
@Module({
  imports: [ConfigModule],
  providers: [EnvironmentConfigService],
  exports: [EnvironmentConfigService],
})
export class EnvironmentConfigModule {}

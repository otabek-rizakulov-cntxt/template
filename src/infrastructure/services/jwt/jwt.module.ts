import { Module } from '@nestjs/common';
import { JwtModule as Jwt } from '@nestjs/jwt';

import { JwtTokenService } from './jwt.service';
import { EnvironmentConfigModule } from '@config/environment-config/environment-config.module';
import { EnvironmentConfigService } from '@config/environment-config/environment-config.service';

/**
 * Registers @nestjs/jwt asynchronously so the secret comes from the validated
 * config adapter. Reading process.env at module-definition time evaluated before
 * .env was loaded, which is how an undefined secret could slip through.
 */
@Module({
  imports: [
    Jwt.registerAsync({
      imports: [EnvironmentConfigModule],
      inject: [EnvironmentConfigService],
      useFactory: (config: EnvironmentConfigService) => ({
        secret: config.getJwtSecret(),
        signOptions: { expiresIn: `${config.getJwtExpirationTime()}s` },
      }),
    }),
  ],
  providers: [JwtTokenService],
  exports: [JwtTokenService],
})
export class JwtModule {}

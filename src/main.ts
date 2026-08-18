import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as cookieParser from 'cookie-parser';
import helmet from 'helmet';

import { AppModule } from './app.module';
import { ValidatorConfig } from '@infrastructure/config';
import { LoggerService } from '@infrastructure/logger/logger.service';
import { EnvironmentConfigService } from '@config/environment-config/environment-config.service';
import { AllExceptionFilter } from '@infrastructure/common/filter/exception.filter';
import { LoggingInterceptor } from '@infrastructure/common/interceptors/logger.interceptor';
import {
  ResponseFormat,
  ResponseInterceptor,
} from '@infrastructure/common/interceptors/response.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const config = app.get(EnvironmentConfigService);
  const isProduction = config.getNodeEnv() === 'production';

  // Resolve the logger from the container instead of constructing it by hand, so
  // the filter and interceptor share one configured instance.
  const logger = await app.resolve(LoggerService);

  app.use(cookieParser());
  app.use(helmet());

  // An explicit allowlist. `enableCors()` with no options reflects any origin,
  // which combined with cookie credentials lets any site call the API as the
  // logged-in user.
  app.enableCors({
    origin: config.getCorsAllowedOrigins(),
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  app.useGlobalFilters(new AllExceptionFilter(logger, isProduction));
  app.useGlobalPipes(new ValidationPipe(ValidatorConfig));
  app.useGlobalInterceptors(
    new LoggingInterceptor(logger),
    new ResponseInterceptor(),
  );

  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI });

  // Drain in-flight requests and close the database pool on SIGTERM/SIGINT.
  app.enableShutdownHooks();

  if (!isProduction) {
    const swaggerConfig = new DocumentBuilder()
      .addBearerAuth()
      .setTitle('Clean Architecture NestJS')
      .setDescription('Example template')
      .setVersion('1.0')
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig, {
      extraModels: [ResponseFormat],
      deepScanRoutes: true,
    });
    SwaggerModule.setup('docs', app, document);
  }

  const port = config.getAppPort();
  await app.listen(port, config.getAppHost());
  logger.log('bootstrap', `Listening on port ${port}`);
}

void bootstrap();

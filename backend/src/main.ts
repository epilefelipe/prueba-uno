import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';

const logger = new Logger('Bootstrap');

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  });

  // Apply validation pipe only to REST endpoints
  // GraphQL has its own validation via class-validator decorators on DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      skipMissingProperties: true,
    }),
  );

  // Inject request ID if not present
  app.use((req, res, next) => {
    if (!req.headers['x-request-id']) {
      req.headers['x-request-id'] = crypto.randomUUID();
    }
    next();
  });

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  logger.log(`Payment Processing Service running on port ${port}`);
  logger.log(`GraphQL Playground: http://localhost:${port}/graphql`);
  logger.log(`REST API: http://localhost:${port}/payments`);
}
bootstrap();

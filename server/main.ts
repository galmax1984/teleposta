import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Enable CORS for the frontend
  app.enableCors({
    origin: ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:3333'], // Vite dev server and Docker frontend
    credentials: true,
  });
  
  await app.listen(3001);
  console.log('🚀 NestJS server running on http://localhost:3001');
}

bootstrap();

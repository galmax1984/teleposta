import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Enable CORS for the frontend
  app.enableCors({
    origin: ['http://localhost:3000', 'http://localhost:5173'], // Vite dev server
    credentials: true,
  });
  
  await app.listen(3001);
  console.log('🚀 NestJS server running on http://localhost:3001');
}

bootstrap();

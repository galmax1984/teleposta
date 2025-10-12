import { Module, OnModuleInit } from '@nestjs/common';
import { db, initDatabase } from './database';

@Module({
  providers: [
    {
      provide: 'DATABASE_CONNECTION',
      useValue: db,
    },
  ],
  exports: ['DATABASE_CONNECTION'],
})
export class DatabaseModule implements OnModuleInit {
  async onModuleInit() {
    await initDatabase();
    console.log('📊 Database initialized');
  }
}

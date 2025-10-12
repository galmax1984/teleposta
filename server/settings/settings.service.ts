import { Injectable, Inject } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { db } from '../database/database';
import { settings, type Setting, type NewSetting } from '../database/schema';

@Injectable()
export class SettingsService {
  constructor(@Inject('DATABASE_CONNECTION') private database: typeof db) {}

  async findAll(): Promise<Setting[]> {
    return this.database.select().from(settings);
  }

  async findOne(id: number): Promise<Setting | null> {
    const result = await this.database.select().from(settings).where(eq(settings.id, id));
    return result[0] || null;
  }

  async create(createSettingDto: NewSetting): Promise<Setting> {
    const result = await this.database.insert(settings).values(createSettingDto);
    const setting = await this.findOne(result.insertId);
    return setting!;
  }

  async update(id: number, updateSettingDto: Partial<Setting>): Promise<Setting | null> {
    await this.database.update(settings).set(updateSettingDto).where(eq(settings.id, id));
    return this.findOne(id);
  }

  async remove(id: number): Promise<boolean> {
    const result = await this.database.delete(settings).where(eq(settings.id, id));
    return result.affectedRows > 0;
  }
}

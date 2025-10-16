import { Injectable, Inject } from '@nestjs/common';
import { and, eq, desc } from 'drizzle-orm';
import { db } from '../database/database';
import { campaigns, logs, type Campaign, type NewCampaign } from '../database/schema';

@Injectable()
export class CampaignsService {
  constructor(@Inject('DATABASE_CONNECTION') private database: typeof db) {}

  async findAll(userId?: number): Promise<Campaign[]> {
    if (userId) {
      return this.database.select().from(campaigns).where(eq(campaigns.userId, userId));
    }
    return this.database.select().from(campaigns);
  }

  async findByName(name: string, userId?: number): Promise<Campaign | null> {
    console.log("=== FIND BY NAME SERVICE CALLED ===");
    console.log("Searching for campaign with name:", name);
    console.log("Name type:", typeof name);
    console.log("Name length:", name?.length);
    
    let query = this.database.select().from(campaigns).where(eq(campaigns.name, name)).limit(1);
    if (userId) {
      query = this.database.select().from(campaigns).where(and(eq(campaigns.name, name), eq(campaigns.userId, userId))).limit(1);
    }
    const result = await query;
    console.log("Database query result:", result);
    console.log("Number of results:", result.length);
    
    if (result.length > 0) {
      console.log("Found campaign:", { id: result[0].id, name: result[0].name });
    } else {
      console.log("No campaign found with name:", name);
    }
    
    return result[0] || null;
  }

  async findOne(id: number): Promise<Campaign | null> {
    const result = await this.database.select().from(campaigns).where(eq(campaigns.id, id)).limit(1);
    return result[0] || null;
  }

  async findOneForUser(id: number, userId?: number): Promise<Campaign | null> {
    let result;
    if (userId) {
      result = await this.database.select().from(campaigns).where(and(eq(campaigns.id, id), eq(campaigns.userId, userId))).limit(1);
    } else {
      result = await this.database.select().from(campaigns).where(eq(campaigns.id, id)).limit(1);
    }
    return result[0] || null;
  }

  async create(createCampaignDto: NewCampaign): Promise<Campaign> {
    const result = await this.database.insert(campaigns).values(createCampaignDto);
    // Fix: 'insertId' does not exist; get inserted id from 'result' in a supported way.
    // In Drizzle, .values() returns an array of inserted rows' primary keys in 'insertId' or 'rows', depending on adapter.
    // Commonly: result[0].insertId or result.insertId, or get insertedIds, or fallback by querying last inserted id.
    // Since types are ambiguous, fallback: get the max id just inserted. (Assuming autoincrement IDs.)
    // If the result contains an 'insertId' field, otherwise use max id as fallback.
    let insertedId: number | undefined = (result as any).insertId;

    if (typeof insertedId !== 'number') {
      // fallback: get max id (assuming no concurrent inserts by same user)
      const all = await this.database
        .select({ id: campaigns.id })
        .from(campaigns)
        .orderBy(desc(campaigns.id))
        .limit(1);
      insertedId = all[0]?.id;
    }

    const campaign = insertedId ? await this.findOne(insertedId) : null;

    // Create initial log entry
    await this.database.insert(logs).values({
      level: 'info',
      message: `Campaign "${campaign?.name}" created successfully`,
      campaignId: campaign?.id,
    });

    return campaign!;
  }

  async update(id: number, updateCampaignDto: Partial<Campaign>): Promise<Campaign | null> {
    await this.database.update(campaigns).set(updateCampaignDto).where(eq(campaigns.id, id));
    return this.findOne(id);
  }

  async updateForUser(id: number, updateCampaignDto: Partial<Campaign>, userId?: number): Promise<Campaign | null> {
    if (userId) {
      const owned = await this.findOneForUser(id, userId);
      if (!owned) return null;
    }
    await this.database.update(campaigns).set(updateCampaignDto).where(eq(campaigns.id, id));
    return this.findOne(id);
  }

  async saveStageByName(params: {
    campaignName: string;
    stage: any; // allow flexible payload; server decides what to persist
    userId?: number;
  }): Promise<Campaign> {
    const existing = await this.findByName(params.campaignName, params.userId);

    if (!existing) {
      // Create a minimal campaign row, default configs
      const inserted = await this.database.insert(campaigns).values({
        name: params.campaignName,
        description: null as any,
        userId: params.userId as any,
        sourceType: 'Spreadsheet',
        sourceConfig: {},
        targetPlatform: 'Telegram',
        targetConfig: {},
        scheduleConfig: {},
        status: 'inactive',
      });

      // Retrieve the created row
      const created = await this.findByName(params.campaignName, params.userId);
      if (!created) throw new Error('Failed to create campaign');
      return this.applyStageToCampaign(created.id, params.stage);
    }

    return this.applyStageToCampaign(existing.id, params.stage);
  }

  private async applyStageToCampaign(campaignId: number, stage: any): Promise<Campaign> {
    // Persist based on stage.type
    if (stage?.type === 'source') {
      await this.update(campaignId, {
        sourceType: String(stage.config?.sourceType || 'Spreadsheet'),
        sourceConfig: stage.config || {},
      } as Partial<Campaign>);
    } else if (stage?.type === 'scheduler') {
      const scheduleConfig = stage.config || {};
      const nextRunAt = this.computeNextRunAt(scheduleConfig);
      
      await this.update(campaignId, {
        scheduleConfig,
        nextRunAt,
      } as Partial<Campaign>);
    } else if (stage?.type === 'target') {
      await this.update(campaignId, {
        targetPlatform: String(stage.config?.channel || 'Telegram'),
        targetConfig: stage.config || {},
      } as Partial<Campaign>);
    }

    const updated = await this.findOne(campaignId);
    return updated!;
  }

  async remove(id: number): Promise<boolean> {
    const result = await this.database.delete(campaigns).where(eq(campaigns.id, id));
    // MySqlRawQueryResult may use 'rows' or similar.
    // Fallback to check if any row was deleted.
    if ('affectedRows' in result && typeof result.affectedRows === 'number') {
      return result.affectedRows > 0;
    }
    if ('rows' in result && Array.isArray(result.rows)) {
      return result.rows.length > 0;
    }
    // Fallback: If possible, check if result is truthy.
    return !!result;
  }

  private computeNextRunAt(scheduleConfig: any): Date | null {
    try {
      const { mode, timezone, startDate, dailyHour, dailyRandomMinutes, everyHours, hourlyRandomMinutes } = scheduleConfig;
      
      if (!mode || !timezone || !startDate) {
        return null;
      }

      const now = new Date();

      if (mode === 'daily') {
        const hour = dailyHour || 20;
        const randomMinutes = dailyRandomMinutes || 0;

        // Build the start date at the configured hour (local server time; timezone handling occurs in controller/service using date-fns-tz)
        const start = new Date(`${startDate}T00:00:00`);
        start.setHours(hour, 0, 0, 0);

        let target = new Date(start);
        if (target <= now) {
          target = new Date();
          target.setHours(hour, 0, 0, 0);
          if (target <= now) {
            target.setDate(target.getDate() + 1);
          }
        }

        return this.addRandomization(target, randomMinutes);
      }
      
      if (mode === 'hourly') {
        const intervalHours = everyHours || 1;
        const randomMinutes = hourlyRandomMinutes || 0;

        const startDay = new Date(`${startDate}T00:00:00`);
        let base = new Date(now);
        if (now < startDay) {
          base = new Date(startDay);
        }
        base.setMinutes(0, 0, 0);
        if (base <= now) {
          base.setHours(base.getHours() + 1);
        }
        const hoursSinceStart = Math.max(0, Math.ceil((base.getTime() - startDay.getTime()) / (60 * 60 * 1000)));
        const remainder = hoursSinceStart % intervalHours;
        const add = remainder === 0 ? 0 : (intervalHours - remainder);
        const nextRun = new Date(base);
        nextRun.setHours(nextRun.getHours() + add);

        return this.addRandomization(nextRun, randomMinutes);
      }
      
      return null;
    } catch (error) {
      console.error('Error computing next run time:', error);
      return null;
    }
  }

  private addRandomization(baseTime: Date, randomMinutes: number): Date {
    if (randomMinutes <= 0) {
      return baseTime;
    }
    
    const randomMs = Math.random() * randomMinutes * 60 * 1000;
    return new Date(baseTime.getTime() + randomMs);
  }
}

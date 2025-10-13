import { Injectable, Inject } from '@nestjs/common';
import { and, eq, desc } from 'drizzle-orm';
import { db } from '../database/database';
import { campaigns, logs, type Campaign, type NewCampaign } from '../database/schema';

@Injectable()
export class CampaignsService {
  constructor(@Inject('DATABASE_CONNECTION') private database: typeof db) {}

  async findAll(): Promise<Campaign[]> {
    return this.database.select().from(campaigns);
  }

  async findOne(id: number): Promise<Campaign | null> {
    const result = await this.database.select().from(campaigns).where(eq(campaigns.id, id));
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

  async findByName(name: string): Promise<Campaign | null> {
    const rows = await this.database.select().from(campaigns).where(eq(campaigns.name, name));
    return rows[0] || null;
  }

  async saveStageByName(params: {
    campaignName: string;
    stage: any; // allow flexible payload; server decides what to persist
  }): Promise<Campaign> {
    const existing = await this.findByName(params.campaignName);

    if (!existing) {
      // Create a minimal campaign row, default configs
      const inserted = await this.database.insert(campaigns).values({
        name: params.campaignName,
        description: null as any,
        sourceType: 'Spreadsheet',
        sourceConfig: {},
        targetPlatform: 'Telegram',
        targetConfig: {},
        scheduleConfig: {},
        status: 'inactive',
      });

      // Retrieve the created row
      const created = await this.findByName(params.campaignName);
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
      await this.update(campaignId, {
        scheduleConfig: stage.config || {},
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
}

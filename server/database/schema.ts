import { mysqlTable, varchar, text, int, boolean, timestamp, json } from 'drizzle-orm/mysql-core';

// Settings table for API keys and configuration
export const settings = mysqlTable('settings', {
  id: int('id').primaryKey().autoincrement(),
  platform: varchar('platform', { length: 50 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  apiKey: text('api_key').notNull(),
  webhookUrl: text('webhook_url'),
  chatId: varchar('chat_id', { length: 255 }),
  sheetId: varchar('sheet_id', { length: 255 }),
  airtableBaseId: varchar('airtable_base_id', { length: 255 }),
  airtableTableId: varchar('airtable_table_id', { length: 255 }),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
});

// Users table for authentication
export const users = mysqlTable('users', {
  id: int('id').primaryKey().autoincrement(),
  provider: varchar('provider', { length: 32 }).notNull(), // 'google'
  providerUserId: varchar('provider_user_id', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }),
  name: varchar('name', { length: 255 }),
  avatarUrl: text('avatar_url'),
  role: varchar('role', { length: 32 }).default('user'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
});

// Campaigns table for managing posting campaigns
export const campaigns = mysqlTable('campaigns', {
  id: int('id').primaryKey().autoincrement(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  userId: int('user_id').references(() => users.id),
  sourceType: varchar('source_type', { length: 50 }).notNull(),
  sourceConfig: json('source_config').notNull(),
  targetPlatform: varchar('target_platform', { length: 50 }).notNull(),
  targetConfig: json('target_config').notNull(),
  scheduleConfig: json('schedule_config').notNull(),
  status: varchar('status', { length: 50 }).notNull().default('inactive'),
  lastRunAt: timestamp('last_run_at'),
  nextRunAt: timestamp('next_run_at'),
  totalPosts: int('total_posts').default(0),
  successfulPosts: int('successful_posts').default(0),
  failedPosts: int('failed_posts').default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
});

// Posts table for scheduled and posted content
export const posts = mysqlTable('posts', {
  id: int('id').primaryKey().autoincrement(),
  campaignId: int('campaign_id').references(() => campaigns.id),
  content: text('content').notNull(),
  platform: varchar('platform', { length: 50 }).notNull(),
  status: varchar('status', { length: 50 }).notNull().default('pending'),
  scheduledAt: timestamp('scheduled_at'),
  postedAt: timestamp('posted_at'),
  errorMessage: text('error_message'),
  source: varchar('source', { length: 50 }).notNull(),
  sourceId: varchar('source_id', { length: 255 }),
  metadata: json('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
});

// Schedules table for recurring posts (legacy - keeping for compatibility)
export const schedules = mysqlTable('schedules', {
  id: int('id').primaryKey().autoincrement(),
  name: varchar('name', { length: 255 }).notNull(),
  platform: varchar('platform', { length: 50 }).notNull(),
  source: varchar('source', { length: 50 }).notNull(),
  sourceConfig: json('source_config').notNull(),
  frequency: varchar('frequency', { length: 50 }).notNull(),
  cronExpression: varchar('cron_expression', { length: 255 }),
  isActive: boolean('is_active').default(true),
  lastRunAt: timestamp('last_run_at'),
  nextRunAt: timestamp('next_run_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
});

// Logs table for tracking operations
export const logs = mysqlTable('logs', {
  id: int('id').primaryKey().autoincrement(),
  level: varchar('level', { length: 20 }).notNull(),
  message: text('message').notNull(),
  platform: varchar('platform', { length: 50 }),
  campaignId: int('campaign_id').references(() => campaigns.id),
  postId: int('post_id'),
  scheduleId: int('schedule_id'),
  metadata: json('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Type exports for TypeScript
export type Setting = typeof settings.$inferSelect;
export type NewSetting = typeof settings.$inferInsert;
export type Campaign = typeof campaigns.$inferSelect;
export type NewCampaign = typeof campaigns.$inferInsert;
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Post = typeof posts.$inferSelect;
export type NewPost = typeof posts.$inferInsert;
export type Schedule = typeof schedules.$inferSelect;
export type NewSchedule = typeof schedules.$inferInsert;
export type Log = typeof logs.$inferSelect;
export type NewLog = typeof logs.$inferInsert;

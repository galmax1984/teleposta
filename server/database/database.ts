import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from './schema';

// Create MySQL connection
const connection = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'teleposta',
});

export const db = drizzle(connection, { schema, mode: 'default' });

// Initialize database with tables
export async function initDatabase() {
  try {
    // Create tables if they don't exist
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        platform VARCHAR(50) NOT NULL,
        name VARCHAR(255) NOT NULL,
        api_key TEXT NOT NULL,
        webhook_url TEXT,
        chat_id VARCHAR(255),
        sheet_id VARCHAR(255),
        airtable_base_id VARCHAR(255),
        airtable_table_id VARCHAR(255),
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      );
    `);

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS campaigns (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        source_type VARCHAR(50) NOT NULL,
        source_config JSON NOT NULL,
        target_platform VARCHAR(50) NOT NULL,
        target_config JSON NOT NULL,
        schedule_config JSON NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'inactive',
        last_run_at TIMESTAMP NULL,
        next_run_at TIMESTAMP NULL,
        total_posts INT DEFAULT 0,
        successful_posts INT DEFAULT 0,
        failed_posts INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      );
    `);

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS posts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        campaign_id INT,
        content TEXT NOT NULL,
        platform VARCHAR(50) NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'pending',
        scheduled_at TIMESTAMP NULL,
        posted_at TIMESTAMP NULL,
        error_message TEXT,
        source VARCHAR(50) NOT NULL,
        source_id VARCHAR(255),
        metadata JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
      );
    `);

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS schedules (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        platform VARCHAR(50) NOT NULL,
        source VARCHAR(50) NOT NULL,
        source_config JSON NOT NULL,
        frequency VARCHAR(50) NOT NULL,
        cron_expression VARCHAR(255),
        is_active BOOLEAN DEFAULT TRUE,
        last_run_at TIMESTAMP NULL,
        next_run_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      );
    `);

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        level VARCHAR(20) NOT NULL,
        message TEXT NOT NULL,
        platform VARCHAR(50),
        campaign_id INT,
        post_id INT,
        schedule_id INT,
        metadata JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
      );
    `);

    console.log('📊 MySQL database initialized successfully');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
}

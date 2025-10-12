# Teleposta - Social Media Automation Platform

A full-stack application for automating social media posts from Google Sheets or Airtable to Telegram and Instagram.

## Architecture

- **Frontend**: React with Vite
- **Backend**: NestJS with TypeScript
- **Database**: MySQL with Drizzle ORM
- **Containerization**: Docker & Docker Compose

## Quick Start with Docker

### Production Setup

1. **Build and start all services:**
   ```bash
   docker-compose up -d
   ```

2. **Access the application:**
   - Frontend: http://localhost:3333
   - API: http://localhost:3001
   - Database: localhost:3306

3. **Stop services:**
   ```bash
   docker-compose down
   ```

### Development Setup

1. **Start database only:**
   ```bash
   docker-compose -f docker-compose.dev.yml up database -d
   ```

2. **Run frontend and backend locally:**
   ```bash
   # Terminal 1 - Backend
   pnpm run dev:server

   # Terminal 2 - Frontend
   pnpm run dev
   ```

3. **Access the application:**
   - Frontend: http://localhost:5173
   - API: http://localhost:3001

## Services

### Frontend (Port 80)
- React application with Vite
- Served by Nginx
- Proxies API requests to backend

### Backend (Port 3001)
- NestJS API server
- RESTful endpoints for campaigns, logs, and settings
- Connects to MySQL database

### Database (Port 3306)
- MySQL 8.0
- Persistent data storage
- Auto-initialized with required tables

## API Endpoints

- `GET /api/campaigns` - List all campaigns
- `POST /api/campaigns` - Create new campaign
- `GET /api/campaigns/:id` - Get campaign by ID
- `PATCH /api/campaigns/:id` - Update campaign
- `DELETE /api/campaigns/:id` - Delete campaign
- `GET /api/logs` - List logs (optional campaignId filter)
- `POST /api/logs` - Create log entry
- `GET /api/settings` - List all settings
- `POST /api/settings` - Create new setting

## Environment Variables

- `DB_HOST` - Database host (default: localhost)
- `DB_PORT` - Database port (default: 3306)
- `DB_USER` - Database user (default: ui_poster)
- `DB_PASSWORD` - Database password (default: password)
- `DB_NAME` - Database name (default: ui_poster)

## Development

### Prerequisites
- Node.js 18+
- pnpm
- Docker & Docker Compose

### Local Development
1. Install dependencies: `pnpm install`
2. Start database: `docker-compose -f docker-compose.dev.yml up database -d`
3. Run backend: `pnpm run dev:server`
4. Run frontend: `pnpm run dev`

### Database Migrations
```bash
# Generate migrations
pnpm run db:generate

# Apply migrations
pnpm run db:migrate

# Open Drizzle Studio
pnpm run db:studio
```

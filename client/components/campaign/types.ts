export type StageType = "source" | "scheduler" | "target";

export const STAGE_ORDER: StageType[] = ["source", "scheduler", "target"];
export const MAX_STAGES = STAGE_ORDER.length;
export const MAX_CAMPAIGNS = 5;

export const SOURCE_OPTIONS = ["Spreadsheet", "Airtable"] as const;
export type SourceOption = (typeof SOURCE_OPTIONS)[number];

// Deprecated, kept for backward compatibility mapping
export const SCHEDULER_OPTIONS = ["Every 5h", "Everyday at 20:00"] as const;
export type SchedulerOption = (typeof SCHEDULER_OPTIONS)[number];

export const TARGET_OPTIONS = ["Instagram", "Telegram"] as const;
export type TargetOption = (typeof TARGET_OPTIONS)[number];

export const SYNC_MODES = ["Append new rows", "Replace matching rows"] as const;
export type SyncMode = (typeof SYNC_MODES)[number];

export const AUTO_PUBLISH_WINDOWS = [
  "Immediately",
  "Schedule & approve manually",
] as const;
export type AutoPublishWindow = (typeof AUTO_PUBLISH_WINDOWS)[number];

type StageBase = {
  id: string;
  completed: boolean;
};

export interface SourceStage extends StageBase {
  type: "source";
  config: {
    sourceType: SourceOption;
    datasetName: string;
    syncMode: SyncMode;
    // Google Sheets specific configuration
    googleSheets?: {
      credentials: {
        client_email: string;
        private_key: string;
        project_id: string;
        api_key?: string;
      };
      spreadsheetId: string;
      sheetName: string;
      range?: string;
      contentColumn: string;
      imageColumn?: string;
      metadataColumn?: string;
    };
    // Airtable specific configuration
    airtable?: {
      apiKey: string;
      baseId: string;
      tableId: string;
      contentField: string;
      imageField?: string;
      metadataField?: string;
    };
  };
}

export interface SchedulerStage extends StageBase {
  type: "scheduler";
  config: {
    mode: "daily" | "hourly";
    timezone: string; // IANA timezone string
    // daily mode config
    dailyHour?: number; // 0-23
    dailyRandomMinutes?: number; // 0-120
    // hourly mode config
    everyHours?: number; // >=1
    hourlyRandomMinutes?: number; // 0-120
    startDate?: string; // YYYY-MM-DD
  };
}

export interface TargetStage extends StageBase {
  type: "target";
  config: {
    channel: TargetOption;
    destination: string;
    autoPublish: AutoPublishWindow;
    // Telegram Bot API settings (used when channel === 'Telegram')
    telegram?: {
      botToken: string;
      chatIdOrUsername: string; // e.g. -1001234567890 or @mychannel
      parseMode?: 'MarkdownV2' | 'HTML' | 'None';
      disableWebPagePreview?: boolean;
      messageThreadId?: string; // forums/topics
    };
  };
}

export type Stage = SourceStage | SchedulerStage | TargetStage;

export interface Campaign {
  id: string;
  name: string;
  stages: Stage[];
  lastRunAt?: string | null;
  nextRunAt?: string | null;
  status?: "Pending" | "Active";
}

export const createId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `id-${Math.random().toString(36).slice(2, 10)}`;

export const createStage = (type: StageType, campaignId?: string): Stage => {
  const stageId = campaignId ? `${type}-${campaignId}` : createId();
  
  switch (type) {
    case "source":
      return {
        id: stageId,
        type,
        completed: false,
        config: {
          sourceType: SOURCE_OPTIONS[0],
          datasetName: "",
          syncMode: SYNC_MODES[0],
        },
      };
    case "scheduler":
      return {
        id: stageId,
        type,
        completed: false,
        config: {
          mode: "daily",
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
          dailyHour: 20,
          dailyRandomMinutes: 0,
          startDate: new Date().toISOString().slice(0, 10),
        },
      };
    case "target":
      return {
        id: stageId,
        type,
        completed: false,
        config: {
          channel: TARGET_OPTIONS[0],
          destination: "",
          autoPublish: AUTO_PUBLISH_WINDOWS[0],
        },
      };
    default: {
      const exhaustiveCheck: never = type;
      throw new Error(`Unsupported stage type: ${exhaustiveCheck}`);
    }
  }
};

export const createCampaign = (index: number): Campaign => ({
  id: createId(),
  name: `Campaign ${index}`,
  stages: [],
  lastRunAt: null,
});

export const getNextStageType = (stages: Stage[]): StageType | null => {
  if (stages.length >= MAX_STAGES) return null;
  return STAGE_ORDER[stages.length];
};

export const isStageConfigComplete = (stage: Stage): boolean => {
  switch (stage.type) {
    case "source":
      // If Spreadsheet is selected, validate Google Sheets configuration
      if (stage.config.sourceType === "Spreadsheet") {
        const googleSheets = stage.config.googleSheets;
        if (!googleSheets) return false;
        
        const hasCredentials = Boolean(
          googleSheets.credentials?.client_email?.trim() &&
          googleSheets.credentials?.private_key?.trim() &&
          googleSheets.credentials?.project_id?.trim() &&
          googleSheets.credentials?.api_key?.trim()
        );

        const hasSpreadsheetConfig = Boolean(
          googleSheets.spreadsheetId?.trim() &&
          googleSheets.sheetName?.trim()
        );
        return hasCredentials && hasSpreadsheetConfig;
      }
      
      // For Airtable, basic validation (can be extended later)
      return true;
      
    case "scheduler": {
      const tzOk = Boolean(stage.config.timezone?.trim()?.length > 0);
      if (stage.config.mode === "daily") {
        const h = stage.config.dailyHour;
        const r = stage.config.dailyRandomMinutes ?? 0;
        return tzOk && typeof h === 'number' && h >= 0 && h <= 23 && r >= 0 && r <= 120;
      }
      if (stage.config.mode === "hourly") {
        const eh = stage.config.everyHours;
        const r = stage.config.hourlyRandomMinutes ?? 0;
        return tzOk && typeof eh === 'number' && eh >= 1 && r >= 0 && r <= 120;
      }
      return false;
    }
    case "target":
      if (stage.config.channel === 'Telegram') {
        const tg = stage.config.telegram;
        return Boolean(tg?.botToken?.trim()) && Boolean(tg?.chatIdOrUsername?.trim());
      }
      return Boolean(stage.config.destination?.trim()?.length > 0) && Boolean(stage.config.channel);
    default:
      return false;
  }
};

export const canAddStage = (stages: Stage[]): boolean => {
  if (stages.length >= MAX_STAGES) return false;
  if (stages.length === 0) return true;
  const lastStage = stages[stages.length - 1];
  return lastStage.completed && isStageConfigComplete(lastStage);
};

export const isCampaignReady = (campaign: Campaign): boolean =>
  campaign.stages.length === MAX_STAGES &&
  campaign.stages.every((stage) => stage.completed && isStageConfigComplete(stage)) &&
  // Ensure all 3 stage types exist
  STAGE_ORDER.every((type) => campaign.stages.some((s) => s.type === type));

export const getStageTitle = (type: StageType): string => {
  switch (type) {
    case "source":
      return "Source";
    case "scheduler":
      return "Scheduler";
    case "target":
      return "Target";
    default:
      return type;
  }
};

export const getStageHeadline = (stage: Stage): string => {
  switch (stage.type) {
    case "source":
      return stage.config.sourceType;
    case "scheduler":
      return stage.config.mode === 'daily'
        ? `Daily at ${String(stage.config.dailyHour ?? 0).padStart(2, '0')}:00`
        : `Every ${stage.config.everyHours ?? 1}h`;
    case "target":
      return stage.config.channel;
    default:
      return "";
  }
};

export const getStageSupportingText = (stage: Stage): string => {
  switch (stage.type) {
    case "source":
      return stage.config.datasetName
        ? `${stage.config.datasetName} · ${stage.config.syncMode}`
        : `Define the dataset and sync mode.`;
    case "scheduler": {
      const tz = stage.config.timezone || 'UTC';
      if (stage.config.mode === 'daily') {
        return `Daily at ${String(stage.config.dailyHour ?? 0).padStart(2, '0')}:00 ± ${stage.config.dailyRandomMinutes ?? 0}m · TZ ${tz}`;
      }
      return `Every ${stage.config.everyHours ?? 1}h ± ${stage.config.hourlyRandomMinutes ?? 0}m · TZ ${tz}`;
    }
    case "target":
      return stage.config.destination
        ? `${stage.config.destination} · ${stage.config.autoPublish}`
        : `Select the destination channel.`;
    default:
      return "";
  }
};

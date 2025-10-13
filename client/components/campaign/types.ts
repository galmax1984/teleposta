export type StageType = "source" | "scheduler" | "target";

export const STAGE_ORDER: StageType[] = ["source", "scheduler", "target"];
export const MAX_STAGES = STAGE_ORDER.length;
export const MAX_CAMPAIGNS = 5;

export const SOURCE_OPTIONS = ["Spreadsheet", "Airtable"] as const;
export type SourceOption = (typeof SOURCE_OPTIONS)[number];

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
    cadence: SchedulerOption;
    timezone: string;
    startDate: string;
  };
}

export interface TargetStage extends StageBase {
  type: "target";
  config: {
    channel: TargetOption;
    destination: string;
    autoPublish: AutoPublishWindow;
  };
}

export type Stage = SourceStage | SchedulerStage | TargetStage;

export interface Campaign {
  id: string;
  name: string;
  stages: Stage[];
  lastRunAt?: string | null;
  status?: "Pending" | "Active";
}

const createId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `id-${Math.random().toString(36).slice(2, 10)}`;

export const createStage = (type: StageType): Stage => {
  switch (type) {
    case "source":
      return {
        id: createId(),
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
        id: createId(),
        type,
        completed: false,
        config: {
          cadence: SCHEDULER_OPTIONS[0],
          timezone: "UTC",
          startDate: new Date().toISOString().slice(0, 10),
        },
      };
    case "target":
      return {
        id: createId(),
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
      const hasDatasetName = Boolean(stage.config.datasetName?.trim()?.length > 0);
      
      // If Spreadsheet is selected, validate Google Sheets configuration
      if (stage.config.sourceType === "Spreadsheet") {
        const googleSheets = stage.config.googleSheets;
        if (!googleSheets) return false;
        
        const hasCredentials = Boolean(
          googleSheets.credentials?.client_email?.trim() &&
          googleSheets.credentials?.private_key?.trim() &&
          googleSheets.credentials?.project_id?.trim()
        );
        
        const hasSpreadsheetConfig = Boolean(
          googleSheets.spreadsheetId?.trim() &&
          googleSheets.sheetName?.trim() &&
          googleSheets.contentColumn?.trim()
        );
        
        return hasDatasetName && hasCredentials && hasSpreadsheetConfig;
      }
      
      // For Airtable, basic validation (can be extended later)
      return hasDatasetName;
      
    case "scheduler":
      return Boolean(stage.config.timezone?.trim()?.length > 0) && Boolean(stage.config.cadence);
    case "target":
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
  campaign.stages.every((stage) => stage.completed && isStageConfigComplete(stage));

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
      return stage.config.cadence;
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
    case "scheduler":
      return `Timezone: ${stage.config.timezone || 'UTC'} · Start ${stage.config.startDate || 'Not set'}`;
    case "target":
      return stage.config.destination
        ? `${stage.config.destination} · ${stage.config.autoPublish}`
        : `Select the destination channel.`;
    default:
      return "";
  }
};

import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import {
  AUTO_PUBLISH_WINDOWS,
  Campaign,
  SOURCE_OPTIONS,
  SCHEDULER_OPTIONS,
  SYNC_MODES,
  TARGET_OPTIONS,
  Stage,
  SourceStage,
  SchedulerStage,
  TargetStage,
  getStageHeadline,
  getStageTitle,
  isStageConfigComplete,
} from "./types";
import { Edit3, RadioTower, Share2, Timer } from "lucide-react";

interface StageSettingsPanelProps {
  campaign: Campaign | null;
  stage: Stage | null;
  onSaveStage: (campaignId: string, stageId: string, nextStage: Stage) => void;
}

const stageIconMap = {
  source: RadioTower,
  scheduler: Timer,
  target: Share2,
} as const;

const glowRing = {
  source: "ring-stage-source/40",
  scheduler: "ring-stage-scheduler/50",
  target: "ring-stage-target/50",
} as const;

const readyBadge = {
  source: "bg-stage-source/10 text-stage-source",
  scheduler: "bg-stage-scheduler/10 text-stage-scheduler",
  target: "bg-stage-target/10 text-stage-target",
} as const;

const getStageFormHeader = (stage: Stage) => {
  switch (stage.type) {
    case "source":
      return {
        title: "",
        description: ""
      };
    case "scheduler":
      return {
        title: "", 
        description: ""
      };
    case "target":
      return {
        title: "",
        description: ""
      };
    default:
      return { title: "", description: "" };
  }
};

export const StageSettingsPanel = ({ campaign, stage, onSaveStage }: StageSettingsPanelProps) => {
  const [draftConfig, setDraftConfig] = useState<Stage["config"] | null>(null);

  useEffect(() => {
    if (!stage) {
      setDraftConfig(null);
      return;
    }

    if (isSource(stage)) {
      setDraftConfig({ ...stage.config });
    } else if (isScheduler(stage)) {
      setDraftConfig({ ...stage.config });
    } else if (isTarget(stage)) {
      setDraftConfig({ ...stage.config });
    }
  }, [stage?.id, stage?.type]);

  const handleConfigChange = (next: Stage["config"]) => {
    setDraftConfig(next);
  };

  const stageDraft = useMemo(() => {
    if (!stage || !draftConfig) return null;
    return { ...stage, config: draftConfig } as Stage;
  }, [stage, draftConfig]);

  const canSave = Boolean(stageDraft && stageDraft.config && isStageConfigComplete(stageDraft));
  const hasChanges = useMemo(() => {
    if (!stage || !draftConfig) return false;
    return JSON.stringify(stage.config) !== JSON.stringify(draftConfig);
  }, [stage, draftConfig]);

  const helperText = useMemo(() => {
    if (!stageDraft || !isStageConfigComplete(stageDraft)) {
      return "Fill in the required settings to continue.";
    }
    if (stage?.completed) {
      return hasChanges
        ? "Save changes to keep this stage aligned."
        : "This stage is ready. Adjust settings anytime.";
    }
    return "Save to unlock the next stage.";
  }, [stageDraft, hasChanges, stage?.completed]);

  if (!campaign) {
    return (
      <aside className="flex h-full flex-col justify-center border rounded-xl border-dashed border-border/60 bg-surface-base/70 p-10 text-center text-sm text-foreground/70">
        <p>Select a campaign to configure its stages.</p>
      </aside>
    );
  }

  if (!stage) {
    return (
      <aside className="flex h-full flex-col justify-center border rounded-xl border-dashed border-border/60 bg-surface-base/70 p-10 text-center text-sm text-foreground/70">
        <p>
          Choose a stage on the right to reveal its configuration panel. Add Source, Scheduler, and Target stages sequentially to unlock the run
          button.
        </p>
      </aside>
    );
  }

  // If stage is selected but draftConfig is not ready yet, show loading state
  if (!draftConfig) {
    return (
      <aside className="flex h-full flex-col justify-center border rounded-xl border-dashed border-border/60 bg-surface-base/70 p-10 text-center text-sm text-foreground/70">
        <p>Loading stage configuration...</p>
      </aside>
    );
  }

  const StageIcon = stageIconMap[stage.type];
  const formHeader = getStageFormHeader(stage);

  return (
    <aside className="flex h-full flex-col rounded-xl overflow-hidden">
      {/* Header section with current background */}
      <div className="bg-surface-base/80 px-8 pt-6 pb-4">
        <div className="flex items-start rounded-2xl justify-between gap-3">
          <div className="flex-1">
            <p className="text-xs uppercase tracking-[0.35em] text-foreground/60">{campaign.name}</p>
            <div className="mt-2 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    "flex h-12 w-12 items-center justify-center rounded-full bg-foreground/5 ring-4 ring-inset",
                    glowRing[stage.type],
                  )}
                >
                  <StageIcon className="h-5 w-5 text-foreground" />
                </span>
                <div>
                  <h3 className="text-2xl font-normal text-foreground">{getStageTitle(stage.type)}</h3>
                  <p className="text-sm font-extralight text-foreground/60">{getStageHeadline(stage)}</p>
                </div>
              </div>
              
              {/* Source type selection on the right side of header for source stages */}
              {stage.type === "source" && (
                <div className="flex gap-2">
                  {SOURCE_OPTIONS.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => {
                        const sourceStage = stage as SourceStage;
                        handleConfigChange({
                          ...sourceStage.config,
                          sourceType: option,
                        });
                      }}
                      className={cn(
                        "rounded-xl border px-2 py-1 text-xs font-light transition w-24 text-center",
                        option === (draftConfig as SourceStage["config"]).sourceType
                          ? "border-stage-source bg-stage-source/15 text-stage-source"
                          : "border-border/70 text-foreground/70 hover:border-foreground/70 hover:text-foreground",
                      )}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              )}

              {/* Scheduler mode selection on the right side of header for scheduler stages */}
              {stage.type === "scheduler" && (
                <div className="flex gap-2">
                  {(["daily", "hourly"] as const).map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => {
                        const schedulerStage = stage as SchedulerStage;
                        handleConfigChange({
                          ...schedulerStage.config,
                          mode: option,
                        });
                      }}
                      className={cn(
                        "rounded-xl border px-2 py-1 text-xs font-light transition w-24 text-center",
                        option === (draftConfig as SchedulerStage["config"]).mode
                          ? "border-stage-scheduler bg-stage-scheduler/15 text-stage-scheduler"
                          : "border-border/70 text-foreground/70 hover:border-foreground/70 hover:text-foreground",
                      )}
                    >
                      {option === 'daily' ? 'Daily' : 'Hourly'}
                    </button>
                  ))}
                </div>
              )}

              {/* Target channel selection on the right side of header for target stages */}
              {stage.type === "target" && (
                <div className="flex gap-2">
                  {TARGET_OPTIONS.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => {
                        const targetStage = stage as TargetStage;
                        handleConfigChange({
                          ...targetStage.config,
                          channel: option,
                        });
                      }}
                      className={cn(
                        "rounded-xl border px-2 py-1 text-xs font-light transition w-24 text-center",
                        option === (draftConfig as TargetStage["config"]).channel
                          ? "border-stage-target bg-stage-target/15 text-stage-target"
                          : "border-border/70 text-foreground/70 hover:border-foreground/70 hover:text-foreground",
                      )}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {/* Form header moved here */}
            {formHeader.title && (
              <div className="mt-4">
                <h4 className="text-sm font-normal text-foreground">{formHeader.title}</h4>
                {formHeader.description && (
                  <p className="mt-1 text-xs font-light text-foreground/60">{formHeader.description}</p>
                )}
              </div>
            )}
          </div>
          {stage.completed && (
            <span
              className={cn(
                "rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide",
                readyBadge[stage.type],
              )}
            >
              Ready
            </span>
          )}
        </div>
      </div>

      {/* Content section with textbox background */}
      <div className="flex-1 bg-stage-inactive flex flex-col">
        <div className="flex-1 overflow-y-auto px-8 pt-6 pr-10">
          {isSource(stage) && (
            <SourceForm value={draftConfig as SourceStage["config"]} onChange={handleConfigChange} />
          )}
          {isScheduler(stage) && (
            <SchedulerForm
              value={draftConfig as SchedulerStage["config"]}
              onChange={handleConfigChange}
              scheduledNextRunAt={campaign?.nextRunAt}
            />
          )}
          {isTarget(stage) && (
            <TargetForm value={draftConfig as TargetStage["config"]} onChange={handleConfigChange} />
          )}
        </div>

        <div className="px-8 pb-8 pt-6 flex items-center justify-between gap-3">
          <p className="text-xs text-foreground/60">{helperText}</p>
          <button
            type="button"
            onClick={() => stageDraft && onSaveStage(campaign.id, stage.id, { ...stageDraft, completed: true })}
            disabled={!canSave || !hasChanges}
            className={cn(
              "inline-flex h-11 items-center justify-center gap-2 rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground transition",
              hasChanges && canSave
                ? "shadow-lg shadow-primary/30 hover:bg-primary/90"
                : "cursor-not-allowed bg-primary/30 text-primary-foreground/60",
            )}
          >
            <Edit3 className="h-4 w-4" />
            Save stage
          </button>
        </div>
      </div>
    </aside>
  );
};

type FormProps<T> = {
  value: T;
  onChange: (next: Stage["config"]) => void;
  scheduledNextRunAt?: string | null;
};

const SourceForm = ({ value, onChange }: FormProps<SourceStage["config"]>) => {
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<"idle" | "success" | "error">("idle");
  const [connectionMessage, setConnectionMessage] = useState("");

  const update = (patch: Partial<SourceStage["config"]>) =>
    onChange({ ...value, ...patch });

  const updateGoogleSheets = (patch: Partial<SourceStage["config"]["googleSheets"]>) => {
    const googleSheets = { ...value.googleSheets, ...patch };
    update({ googleSheets });
  };

  const updateCredentials = (patch: Partial<SourceStage["config"]["googleSheets"]["credentials"]>) => {
    const credentials = { ...value.googleSheets?.credentials, ...patch };
    updateGoogleSheets({ credentials });
  };

  const testConnection = async () => {
    if (!value.googleSheets?.credentials || !value.googleSheets?.spreadsheetId) {
      setConnectionStatus("error");
      setConnectionMessage("Please fill in credentials and spreadsheet ID first");
      return;
    }

    setIsTestingConnection(true);
    setConnectionStatus("idle");

    try {
      // Fix private key formatting - handle both literal \n and actual newlines
      let privateKey = value.googleSheets.credentials.private_key;
      
      // If it contains literal \n, replace them with actual newlines
      if (privateKey.includes('\\n')) {
        privateKey = privateKey.replace(/\\n/g, '\n');
      }
      
      // If the private key is missing line breaks entirely, add them
      if (privateKey.includes('-----BEGIN PRIVATE KEY-----') && !privateKey.includes('\n')) {
        // Add newlines after BEGIN and before END markers
        privateKey = privateKey.replace('-----BEGIN PRIVATE KEY-----', '-----BEGIN PRIVATE KEY-----\n');
        privateKey = privateKey.replace('-----END PRIVATE KEY-----', '\n-----END PRIVATE KEY-----');
        
        // Add newlines every 64 characters in the key content
        const beginMarker = '-----BEGIN PRIVATE KEY-----\n';
        const endMarker = '\n-----END PRIVATE KEY-----';
        const keyContent = privateKey.substring(beginMarker.length, privateKey.length - endMarker.length);
        
        // Split the key content into 64-character lines
        const lines = [];
        for (let i = 0; i < keyContent.length; i += 64) {
          lines.push(keyContent.substring(i, i + 64));
        }
        
        privateKey = beginMarker + lines.join('\n') + endMarker;
      }
      
      // Ensure proper formatting with BEGIN/END markers
      if (!privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
        privateKey = '-----BEGIN PRIVATE KEY-----\n' + privateKey + '\n-----END PRIVATE KEY-----';
      }
      
      const fixedCredentials = {
        ...value.googleSheets.credentials,
        private_key: privateKey
      };

      console.log('Testing connection with:', {
        credentials: fixedCredentials,
        spreadsheetId: value.googleSheets.spreadsheetId,
      });
      
      const response = await fetch("http://localhost:3001/api/google-sheets/test-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          credentials: fixedCredentials,
          spreadsheetId: value.googleSheets.spreadsheetId,
        }),
      });

      console.log('Response status:', response.status);
      const result = await response.json();
      console.log('Response result:', result);
      
      if (result.success) {
        setConnectionStatus("success");
        setConnectionMessage("Connection successful!");
      } else {
        setConnectionStatus("error");
        setConnectionMessage(result.message || "Connection failed");
      }
    } catch (error) {
      setConnectionStatus("error");
      setConnectionMessage("Failed to test connection");
    } finally {
      setIsTestingConnection(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">

      {/* Google Sheets Configuration */}
      {value.sourceType === "Spreadsheet" && (
        <section className="grid gap-3">
            
            {/* Service Account Credentials */}
            <div className="grid gap-3">
              <label className="flex flex-col text-xs text-foreground">
                Service Account Email
                <input
                  value={value.googleSheets?.credentials?.client_email || ""}
                  onChange={(event) => updateCredentials({ client_email: event.target.value })}
                  placeholder="your-service-account@project.iam.gserviceaccount.com"
                  className="mt-1 border border-border/70 bg-stage-inactive px-2 py-1 text-sm text-foreground placeholder:text-foreground/40 focus:border-border focus:outline-none focus:ring-0"
                />
              </label>

              <label className="flex flex-col text-xs text-foreground">
                Private Key
                <textarea
                  value={value.googleSheets?.credentials?.private_key || ""}
                  onChange={(event) => updateCredentials({ private_key: event.target.value })}
                  placeholder="-----BEGIN PRIVATE KEY-----\nYour private key here...\n-----END PRIVATE KEY-----"
                  rows={4}
                  className="mt-1 border border-border/70 bg-stage-inactive px-2 py-1 text-sm text-foreground placeholder:text-foreground/40 focus:border-border focus:outline-none focus:ring-0 resize-none"
                />
              </label>

              <label className="flex flex-col text-xs text-foreground">
                Project ID
                <input
                  value={value.googleSheets?.credentials?.project_id || ""}
                  onChange={(event) => updateCredentials({ project_id: event.target.value })}
                  placeholder="your-project-id"
                  className="mt-1 border border-border/70 bg-stage-inactive px-2 py-1 text-sm text-foreground placeholder:text-foreground/40 focus:border-border focus:outline-none focus:ring-0"
                />
              </label>

              <label className="flex flex-col text-xs text-foreground">
                API Key (Optional)
                <input
                  value={value.googleSheets?.credentials?.api_key || ""}
                  onChange={(event) => updateCredentials({ api_key: event.target.value })}
                  placeholder="AIzaSy..."
                  className="mt-1 border border-border/70 bg-stage-inactive px-2 py-1 text-sm text-foreground placeholder:text-foreground/40 focus:border-border focus:outline-none focus:ring-0"
                />
                <p className="mt-1 text-xs text-foreground/60">
                  Get from Google Cloud Console → APIs & Services → Credentials
                </p>
              </label>
            </div>

            {/* Spreadsheet Configuration */}
            <div className="grid gap-3 mt-4">
              <label className="flex flex-col text-xs text-foreground">
                Spreadsheet ID
                <div className="flex items-center gap-2 mt-1">
                  <input
                    value={value.googleSheets?.spreadsheetId || ""}
                    onChange={(event) => updateGoogleSheets({ spreadsheetId: event.target.value })}
                    placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                    className="flex-1 border border-border/70 bg-stage-inactive px-3 py-2 text-sm text-foreground placeholder:text-foreground/40 focus:border-border focus:outline-none focus:ring-0"
                  />
                  <button
                    type="button"
                    onClick={testConnection}
                    disabled={isTestingConnection || !value.googleSheets?.credentials?.client_email || !value.googleSheets?.credentials?.private_key || !value.googleSheets?.credentials?.project_id || !value.googleSheets?.spreadsheetId}
                    className={cn(
                      "w-1/4 rounded-xl border px-3 py-2 text-xs font-light transition whitespace-nowrap",
                      isTestingConnection || !value.googleSheets?.credentials?.client_email || !value.googleSheets?.credentials?.private_key || !value.googleSheets?.credentials?.project_id || !value.googleSheets?.spreadsheetId
                        ? "border-border/30 text-foreground/40 cursor-not-allowed"
                        : "border-stage-source/50 text-stage-source hover:border-foreground/70 hover:text-foreground"
                    )}
                  >
                    {isTestingConnection ? "Testing..." : "Test Connection"}
                  </button>
                </div>
                <p className="mt-1 text-xs text-foreground/60">
                  Found in the spreadsheet URL: docs.google.com/spreadsheets/d/[SPREADSHEET_ID]/edit
                </p>
                {connectionStatus !== "idle" && (
                  <p className={cn(
                    "mt-1 text-xs font-medium",
                    connectionStatus === "success" ? "text-green-600" : "text-red-600"
                  )}>
                    {connectionMessage}
                  </p>
                )}
              </label>

              <label className="flex flex-col text-xs text-foreground">
                Sheet Name
                <input
                  value={value.googleSheets?.sheetName || ""}
                  onChange={(event) => updateGoogleSheets({ sheetName: event.target.value })}
                  placeholder="Sheet1"
                  className="mt-1 border border-border/70 bg-stage-inactive px-3 py-2 text-sm text-foreground placeholder:text-foreground/40 focus:border-border focus:outline-none focus:ring-0"
                />
              </label>

              {/* <label className="flex flex-col text-xs text-foreground">
                Range (Optional)
                <input
                  value={value.googleSheets?.range || ""}
                  onChange={(event) => updateGoogleSheets({ range: event.target.value })}
                  placeholder="A1:Z100"
                  className="mt-1 border border-border/70 bg-stage-inactive px-3 py-2 text-sm text-foreground placeholder:text-foreground/40 focus:border-border focus:outline-none focus:ring-0"
                />
                <p className="mt-1 text-[10px] text-foreground/60">
                  Leave empty to read the entire sheet
                </p>
              </label> */}
            </div>

            {/* Column Mapping */}
            {/* <div className="grid gap-3 mt-4">
              <h5 className="text-sm font-semibold text-foreground">Column Mapping</h5>
              
              <label className="flex flex-col text-sm text-foreground">
                Content Column
                <input
                  value={value.googleSheets?.contentColumn || ""}
                  onChange={(event) => updateGoogleSheets({ contentColumn: event.target.value })}
                  placeholder="A or Content"
                  className="mt-1 border border-border/70 bg-stage-inactive px-3 py-2 text-sm text-foreground placeholder:text-foreground/40 focus:border-border focus:outline-none focus:ring-0"
                />
                <p className="mt-1 text-xs text-foreground/60">
                  Column letter (A, B, C) or column name containing the post content
                </p>
              </label>

              <label className="flex flex-col text-sm text-foreground">
                Image Column (Optional)
                <input
                  value={value.googleSheets?.imageColumn || ""}
                  onChange={(event) => updateGoogleSheets({ imageColumn: event.target.value })}
                  placeholder="B or Image"
                  className="mt-1 border border-border/70 bg-stage-inactive px-3 py-2 text-sm text-foreground placeholder:text-foreground/40 focus:border-border focus:outline-none focus:ring-0"
                />
                <p className="mt-1 text-xs text-foreground/60">
                  Column containing image URLs (optional)
                </p>
              </label>

              <label className="flex flex-col text-sm text-foreground">
                Metadata Column (Optional)
                <input
                  value={value.googleSheets?.metadataColumn || ""}
                  onChange={(event) => updateGoogleSheets({ metadataColumn: event.target.value })}
                  placeholder="C or Metadata"
                  className="mt-1 border border-border/70 bg-stage-inactive px-3 py-2 text-sm text-foreground placeholder:text-foreground/40 focus:border-border focus:outline-none focus:ring-0"
                />
                <p className="mt-1 text-xs text-foreground/60">
                  Column containing additional metadata as JSON (optional)
                </p>
              </label>
            </div> */}
        </section>
      )}
    </div>
  );
};

const SchedulerForm = ({ value, onChange, scheduledNextRunAt }: FormProps<SchedulerStage["config"]>) => {
  const update = (patch: Partial<SchedulerStage["config"]>) =>
    onChange({ ...value, ...patch });

  const timezones = [
    "UTC",
    "America/New_York",
    "America/Chicago", 
    "America/Denver",
    "America/Los_Angeles",
    "Europe/London",
    "Europe/Paris",
    "Europe/Berlin",
    "Europe/Rome",
    "Asia/Tokyo",
    "Asia/Shanghai",
    "Asia/Kolkata",
    "Australia/Sydney",
    "Pacific/Auckland",
  ];

  // Local state for input values to allow free typing
  const [dailyHourInput, setDailyHourInput] = useState<string>(value.dailyHour?.toString() ?? '');

  // Update local input when value changes from outside
  useEffect(() => {
    setDailyHourInput(value.dailyHour?.toString() ?? '');
  }, [value.dailyHour]);

  const handleDailyHourChange = (inputValue: string) => {
    setDailyHourInput(inputValue);
    
    if (inputValue === '') {
      update({ dailyHour: undefined });
      return;
    }
    
    const hour = parseInt(inputValue);
    if (!isNaN(hour) && hour >= 0 && hour <= 23) {
      update({ dailyHour: hour });
    }
  };

  const handleDailyHourBlur = () => {
    // On blur, validate and set to default if invalid
    if (dailyHourInput === '') {
      update({ dailyHour: undefined });
      return;
    }
    
    const hour = parseInt(dailyHourInput);
    if (isNaN(hour) || hour < 0 || hour > 23) {
      // Reset to default if invalid
      setDailyHourInput('20');
      update({ dailyHour: 20 });
    }
  };

  // Helpers to compute preview in selected timezone (client-side, no libs)
  const getDateInTimeZone = (date: Date, timeZone: string): Date => {
    // Converts the given date to the same wall-clock time in the provided timezone
    const inv = new Date(date.toLocaleString('en-US', { timeZone }));
    const diff = date.getTime() - inv.getTime();
    return new Date(date.getTime() - diff);
  };

  // Preview intentionally ignores randomization to match deterministic display; server applies random offset
  const addRandomMinutes = (date: Date, _minutes: number) => date;

  const nextRunPreview = useMemo(() => {
    try {
      const mode = value.mode;
      const tz = value.timezone || 'UTC';
      const startDate = value.startDate;
      if (!mode || !tz || !startDate) return '';

      const now = new Date();
      const nowInTz = getDateInTimeZone(now, tz);

      if (mode === 'daily') {
        const hour = typeof value.dailyHour === 'number' ? value.dailyHour : 20;
        const random = value.dailyRandomMinutes || 0;

        const target = new Date(nowInTz);
        target.setHours(hour, 0, 0, 0);

        // Ensure startDate is respected
        const start = getDateInTimeZone(new Date(startDate + 'T00:00:00'), tz);
        if (target < start) {
          target.setTime(start.getTime());
          target.setHours(hour, 0, 0, 0);
        }

        if (target <= nowInTz) {
          target.setDate(target.getDate() + 1);
        }

        const preview = addRandomMinutes(target, random);
        const local = preview.toLocaleString(undefined, { timeZone: tz, hour12: false });
        const utc = new Date(preview.getTime()).toISOString().replace('T', ' ').replace('Z', ' UTC');
        return `${local} (${tz}) · ${utc}`;
      }

      if (mode === 'hourly') {
        const every = value.everyHours || 1;
        const random = value.hourlyRandomMinutes || 0;

        const target = new Date(nowInTz);
        target.setMinutes(0, 0, 0);
        target.setHours(target.getHours() + every);

        const preview = addRandomMinutes(target, random);
        const local = preview.toLocaleString(undefined, { timeZone: tz, hour12: false });
        const utc = new Date(preview.getTime()).toISOString().replace('T', ' ').replace('Z', ' UTC');
        return `${local} (${tz}) · ${utc}`;
      }

      return '';
    } catch {
      return '';
    }
  }, [value.mode, value.timezone, value.startDate, value.dailyHour, value.dailyRandomMinutes, value.everyHours, value.hourlyRandomMinutes]);

  const scheduledPreview = useMemo(() => {
    try {
      if (!scheduledNextRunAt) return '';
      const tz = value.timezone || 'UTC';
      const scheduled = new Date(scheduledNextRunAt);
      const local = scheduled.toLocaleString(undefined, { timeZone: tz, hour12: false });
      const utc = new Date(scheduled.getTime()).toISOString().replace('T', ' ').replace('Z', ' UTC');
      return `${local} (${tz}) · ${utc}`;
    } catch {
      return '';
    }
  }, [scheduledNextRunAt, value.timezone]);

  return (
    <div className="flex flex-col gap-4">
      {/* Mode Selection moved to header */}

      {/* Daily Mode Settings */}
      {value.mode === "daily" && (
        <section className="grid gap-3">
          <label className="flex flex-col text-xs text-foreground">
            Daily Hour (0-23)
            <input
              type="text"
              value={dailyHourInput}
              onChange={(event) => handleDailyHourChange(event.target.value)}
              onBlur={handleDailyHourBlur}
              placeholder="20"
              className="mt-1 border border-border/70 bg-stage-inactive px-3 py-2 text-sm text-foreground focus:border-border focus:outline-none focus:ring-0"
            />
            {value.dailyHour !== undefined && (value.dailyHour < 0 || value.dailyHour > 23) && (
              <p className="mt-1 text-xs text-red-500">
                Hour must be between 0 and 23
              </p>
            )}
          </label>
          <label className="flex flex-col text-xs text-foreground">
            Random Minutes (0-120)
            <input
              type="number"
              min="0"
              max="120"
              value={value.dailyRandomMinutes || 0}
              onChange={(event) => update({ dailyRandomMinutes: parseInt(event.target.value) || 0 })}
              className="mt-1 border border-border/70 bg-stage-inactive px-3 py-2 text-sm text-foreground focus:border-border focus:outline-none focus:ring-0"
            />
            <p className="mt-1 text-xs text-foreground/60">
              Random delay to avoid predictable posting times
            </p>
          </label>
        </section>
      )}

      {/* Hourly Mode Settings */}
      {value.mode === "hourly" && (
        <section className="grid gap-3">
          <label className="flex flex-col text-xs text-foreground">
            Every Hours (1+)
            <input
              type="number"
              min="1"
              value={value.everyHours || 1}
              onChange={(event) => update({ everyHours: parseInt(event.target.value) || 1 })}
              className="mt-1 border border-border/70 bg-stage-inactive px-3 py-2 text-sm text-foreground focus:border-border focus:outline-none focus:ring-0"
            />
          </label>
          <label className="flex flex-col text-xs text-foreground">
            Random Minutes (0-120)
            <input
              type="number"
              min="0"
              max="120"
              value={value.hourlyRandomMinutes || 0}
              onChange={(event) => update({ hourlyRandomMinutes: parseInt(event.target.value) || 0 })}
              className="mt-1 border border-border/70 bg-stage-inactive px-3 py-2 text-sm text-foreground focus:border-border focus:outline-none focus:ring-0"
            />
            <p className="mt-1 text-xs text-foreground/60">
              Random delay to avoid predictable posting times
            </p>
          </label>
        </section>
      )}

      {/* Timezone Selection */}
      <section>
        <label className="flex flex-col text-xs text-foreground">
          Timezone
          <select
            value={value.timezone || "UTC"}
            onChange={(event) => update({ timezone: event.target.value })}
            className="mt-1 border border-border/70 bg-stage-inactive px-3 py-2 text-sm text-foreground focus:border-border focus:outline-none focus:ring-0"
          >
            {timezones.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </select>
        </label>
      </section>

      {/* Start Date */}
      <section>
        <label className="flex flex-col text-xs text-foreground">
          Start Date
          <input
            type="date"
            value={value.startDate || new Date().toISOString().slice(0, 10)}
            onChange={(event) => update({ startDate: event.target.value })}
            className="mt-1 border border-border/70 bg-stage-inactive px-3 py-2 text-sm text-foreground focus:border-border focus:outline-none focus:ring-0"
          />
        </label>
      </section>

      {scheduledPreview && (
        <section>
          <div className="text-xs text-foreground/70">
            Next run: <span className="text-foreground font-medium">{scheduledPreview.split(' · ')[0]}</span>
          </div>
        </section>
      )}
    </div>
  );
};

const TargetForm = ({ value, onChange }: FormProps<TargetStage["config"]>) => {
  const update = (patch: Partial<TargetStage["config"]>) =>
    onChange({ ...value, ...patch });

  return (
    <div className="flex flex-col gap-6">

      <section className="grid gap-4">
        {value.channel !== 'Telegram' && (
          <label className="flex flex-col text-sm text-foreground">
            Destination handle
            <input
              value={value.destination}
              onChange={(event) => update({ destination: event.target.value })}
              placeholder="e.g. @brand"
              className="mt-2 border border-border/70 bg-stage-inactive px-4 py-3 text-sm text-foreground placeholder:text-foreground/40 focus:border-border focus:outline-none focus:ring-0"
            />
          </label>
        )}

        {value.channel === 'Telegram' && (
          <div className="grid gap-3">
            <label className="flex flex-col text-sm text-foreground">
              Bot Token
              <input
                value={value.telegram?.botToken || ''}
                onChange={(e) => update({ telegram: { ...(value.telegram || {}), botToken: e.target.value } })}
                placeholder="123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"
                className="mt-2 border border-border/70 bg-stage-inactive px-3 py-2 text-sm text-foreground placeholder:text-foreground/40 focus:border-border focus:outline-none focus:ring-0"
              />
            </label>

            <label className="flex flex-col text-sm text-foreground">
              Channel chat_id or @username
              <input
                value={value.telegram?.chatIdOrUsername || ''}
                onChange={(e) => update({ telegram: { ...(value.telegram || {}), chatIdOrUsername: e.target.value } })}
                placeholder="-1001234567890 or @mychannel"
                className="mt-2 border border-border/70 bg-stage-inactive px-3 py-2 text-sm text-foreground placeholder:text-foreground/40 focus:border-border focus:outline-none focus:ring-0"
              />
            </label>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={async () => {
                  if (!value.telegram?.botToken || !value.telegram?.chatIdOrUsername) return;
                  try {
                    const response = await fetch('http://localhost:3001/api/telegram/test-connection', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        botToken: value.telegram.botToken,
                        chatIdOrUsername: value.telegram.chatIdOrUsername,
                      }),
                    });
                    const result = await response.json();
                    if (result.success) {
                      alert('Telegram connection successful');
                    } else {
                      alert(`Telegram connection failed: ${result.message || 'Unknown error'}`);
                    }
                  } catch (err) {
                    alert('Telegram connection failed');
                  }
                }}
                className="rounded-xl border px-3 py-2 text-xs font-light transition"
              >
                Test Connection
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col text-sm text-foreground">
                Parse mode
                <select
                  value={value.telegram?.parseMode || 'None'}
                  onChange={(e) => update({ telegram: { ...(value.telegram || {}), parseMode: e.target.value as any } })}
                  className="mt-2 border border-border/70 bg-stage-inactive px-3 py-2 text-sm text-foreground focus:border-border focus:outline-none focus:ring-0"
                >
                  <option value="None">None</option>
                  <option value="MarkdownV2">MarkdownV2</option>
                  <option value="HTML">HTML</option>
                </select>
              </label>

              <label className="flex items-center gap-2 text-sm text-foreground mt-7">
                <input
                  type="checkbox"
                  checked={Boolean(value.telegram?.disableWebPagePreview)}
                  onChange={(e) => update({ telegram: { ...(value.telegram || {}), disableWebPagePreview: e.target.checked } })}
                  className="h-4 w-4"
                />
                Disable link preview
              </label>
            </div>

            <label className="flex flex-col text-sm text-foreground">
              Message thread ID (optional)
              <input
                value={value.telegram?.messageThreadId || ''}
                onChange={(e) => update({ telegram: { ...(value.telegram || {}), messageThreadId: e.target.value } })}
                placeholder="Forum topic ID"
                className="mt-2 border border-border/70 bg-stage-inactive px-3 py-2 text-sm text-foreground placeholder:text-foreground/40 focus:border-border focus:outline-none focus:ring-0"
              />
            </label>
          </div>
        )}

        <label className="flex flex-col text-sm text-foreground">
          Publishing flow
          <select
            value={value.autoPublish}
            onChange={(event) => update({ autoPublish: event.target.value as TargetStage["config"]["autoPublish"] })}
            className="mt-2 border border-border/70 bg-stage-inactive px-4 py-3 text-sm text-foreground focus:border-border focus:outline-none focus:ring-0"
          >
            {AUTO_PUBLISH_WINDOWS.map((mode) => (
              <option key={mode} value={mode}>
                {mode}
              </option>
            ))}
          </select>
        </label>
      </section>
    </div>
  );
};

const isSource = (stage: Stage): stage is SourceStage => stage.type === "source";
const isScheduler = (stage: Stage): stage is SchedulerStage => stage.type === "scheduler";
const isTarget = (stage: Stage): stage is TargetStage => stage.type === "target";

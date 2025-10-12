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
        title: "Source platform",
        description: "Choose where your data lives."
      };
    case "scheduler":
      return {
        title: "Cadence", 
        description: "Set how often the automation should run."
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
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-foreground/60">{campaign.name}</p>
            <div className="mt-2 flex items-center gap-3">
              <span
                className={cn(
                  "flex h-12 w-12 items-center justify-center rounded-full bg-foreground/5 ring-4 ring-inset",
                  glowRing[stage.type],
                )}
              >
                <StageIcon className="h-5 w-5 text-foreground" />
              </span>
              <div>
                <h3 className="text-2xl font-semibold text-foreground">{getStageTitle(stage.type)}</h3>
                <p className="text-sm text-foreground/60">{getStageHeadline(stage)}</p>
              </div>
            </div>
            {/* Form header moved here */}
            <div className="mt-4">
              <h4 className="text-sm font-semibold text-foreground">{formHeader.title}</h4>
              <p className="mt-1 text-xs text-foreground/60">{formHeader.description}</p>
            </div>
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
            <SchedulerForm value={draftConfig as SchedulerStage["config"]} onChange={handleConfigChange} />
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
};

const SourceForm = ({ value, onChange }: FormProps<SourceStage["config"]>) => {
  const update = (patch: Partial<SourceStage["config"]>) =>
    onChange({ ...value, ...patch });

  return (
    <div className="flex flex-col gap-6">
      <section>
        <div className="grid grid-cols-2 gap-3">
          {SOURCE_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => update({ sourceType: option })}
              className={cn(
                "rounded-2xl border px-4 py-3 text-left text-sm font-medium transition",
                option === value.sourceType
                  ? "border-stage-source bg-stage-source/15 text-stage-source"
                  : "border-border/70 text-foreground/70 hover:border-foreground/70 hover:text-foreground",
              )}
            >
              {option}
            </button>
          ))}
        </div>
      </section>

      <section className="grid gap-4">
        <label className="flex flex-col text-sm text-foreground">
          Dataset name
          <input
            value={value.datasetName}
            onChange={(event) => update({ datasetName: event.target.value })}
            placeholder="e.g. Weekly creators pipeline"
            className="mt-2 border border-border/70 bg-stage-inactive px-4 py-3 text-sm text-foreground placeholder:text-foreground/40 focus:border-border focus:outline-none focus:ring-0"
          />
        </label>

        <label className="flex flex-col text-sm text-foreground">
          Sync mode
          <select
            value={value.syncMode}
            onChange={(event) => update({ syncMode: event.target.value as SourceStage["config"]["syncMode"] })}
            className="mt-2 border border-border/70 bg-stage-inactive px-4 py-3 text-sm text-foreground focus:border-border focus:outline-none focus:ring-0"
          >
            {SYNC_MODES.map((mode) => (
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

const SchedulerForm = ({ value, onChange }: FormProps<SchedulerStage["config"]>) => {
  const update = (patch: Partial<SchedulerStage["config"]>) =>
    onChange({ ...value, ...patch });

  return (
    <div className="flex flex-col gap-6">
      <section>
        <div className="grid grid-cols-2 gap-3">
          {SCHEDULER_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => update({ cadence: option })}
              className={cn(
                "rounded-2xl border px-4 py-3 text-left text-sm font-medium transition",
                option === value.cadence
                  ? "border-stage-scheduler bg-stage-scheduler/20 text-stage-scheduler"
                  : "border-border/70 text-foreground/70 hover:border-foreground/70 hover:text-foreground",
              )}
            >
              {option}
            </button>
          ))}
        </div>
      </section>

      <section className="grid gap-4">
        <label className="flex flex-col text-sm text-foreground">
          Timezone
          <input
            value={value.timezone}
            onChange={(event) => update({ timezone: event.target.value })}
            placeholder="e.g. America/New_York"
            className="mt-2 border border-border/70 bg-stage-inactive px-4 py-3 text-sm text-foreground placeholder:text-foreground/40 focus:border-border focus:outline-none focus:ring-0"
          />
        </label>
        <label className="flex flex-col text-sm text-foreground">
          Start date
          <input
            type="date"
            value={value.startDate}
            onChange={(event) => update({ startDate: event.target.value })}
            className="mt-2 border border-border/70 bg-stage-inactive px-4 py-3 text-sm text-foreground focus:border-border focus:outline-none focus:ring-0"
          />
        </label>
      </section>
    </div>
  );
};

const TargetForm = ({ value, onChange }: FormProps<TargetStage["config"]>) => {
  const update = (patch: Partial<TargetStage["config"]>) =>
    onChange({ ...value, ...patch });

  return (
    <div className="flex flex-col gap-6">
      <section>
        <div className="grid grid-cols-2 gap-3">
          {TARGET_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => update({ channel: option })}
              className={cn(
                "rounded-2xl border px-4 py-3 text-left text-sm font-medium transition",
                option === value.channel
                  ? "border-stage-target bg-stage-target/15 text-stage-target"
                  : "border-border/70 text-foreground/70 hover:border-foreground/70 hover:text-foreground",
              )}
            >
              {option}
            </button>
          ))}
        </div>
      </section>

      <section className="grid gap-4">
        <label className="flex flex-col text-sm text-foreground">
          Destination handle
          <input
            value={value.destination}
            onChange={(event) => update({ destination: event.target.value })}
            placeholder="e.g. @micro-saas-launches"
            className="mt-2 border border-border/70 bg-stage-inactive px-4 py-3 text-sm text-foreground placeholder:text-foreground/40 focus:border-border focus:outline-none focus:ring-0"
          />
        </label>

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

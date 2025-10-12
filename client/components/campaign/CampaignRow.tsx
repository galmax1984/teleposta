import { useEffect, useRef, useState } from "react";
import { StageCard } from "./StageCard";
import {
  Campaign,
  STAGE_ORDER,
  Stage,
  StageType,
  getStageTitle,
  isCampaignReady,
} from "./types";
import { cn } from "@/lib/utils";
import { Plus, Rocket, ArrowRight, Play, CheckCircle, Loader2, X } from "lucide-react";

interface CampaignRowProps {
  campaign: Campaign;
  index: number;
  selectedStageId?: string | null;
  onSelectStage: (campaignId: string, stage: Stage) => void;
  onAddStage: (campaignId: string) => void;
  canAddStage: boolean;
  onRenameCampaign: (campaignId: string, name: string) => void;
  onRunCampaign: (campaignId: string) => void;
  onRemoveStage: (campaignId: string, stageId: string) => void;
}

const stageTypeBadge: Record<StageType, string> = {
  source: "bg-stage-source/15 text-stage-source",
  scheduler: "bg-stage-scheduler/15 text-stage-scheduler",
  target: "bg-stage-target/15 text-stage-target",
};

export const CampaignRow = ({
  campaign,
  index,
  selectedStageId,
  onSelectStage,
  onAddStage,
  canAddStage,
  onRenameCampaign,
  onRunCampaign,
  onRemoveStage,
}: CampaignRowProps) => {
  const [nameDraft, setNameDraft] = useState(campaign.name);
  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setNameDraft(campaign.name);
  }, [campaign.name]);

  const handleRename = () => {
    const trimmed = nameDraft.trim();
    if (!trimmed) {
      setNameDraft(campaign.name);
      return;
    }
    onRenameCampaign(campaign.id, trimmed);
    setIsEditing(false);
  };

  const readyToRun = isCampaignReady(campaign);
  const lastRunLabel = campaign.lastRunAt
    ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(
        new Date(campaign.lastRunAt),
      )
    : "Never";
  const blockedByDraft = !canAddStage && campaign.stages.length < STAGE_ORDER.length;

  return (
    <div
      className={cn(
        "flex w-full flex-col rounded-xl border border-border/80 bg-surface-base/80 p-5",
        "backdrop-blur-lg transition-all",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center flex-1">
          {!isEditing && (
            <div className="w-0.5 h-6 bg-stage-source mr-3 flex-shrink-0"></div>
          )}
          <input
            ref={inputRef}
            value={nameDraft}
            onChange={(event) => setNameDraft(event.target.value)}
            onFocus={() => setIsEditing(true)}
            onBlur={() => {
              handleRename();
              setIsEditing(false);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.currentTarget.blur();
              }
              if (event.key === "Escape") {
                setNameDraft(campaign.name);
                event.currentTarget.blur();
              }
            }}
            className="w-full border-2 rounded-xl border-transparent bg-transparent text-lg font-light text-foreground tracking-wide px-1 focus:border-stage-source focus:outline-none focus:ring-0"
          />
        </div>
        <div className="flex items-center gap-3">
          {readyToRun && (
            <button
              type="button"
              onClick={() => onRunCampaign(campaign.id)}
              className={cn(
                "inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium transition w-[80px] border",
                campaign.status === "Active"
                  ? "rounded-2xl border-stage-target bg-stage-target/15 text-stage-target hover:bg-stage-target/20"
                  : "rounded-full border-transparent bg-primary text-primary-foreground shadow-lg shadow-primary/30 hover:bg-primary/90",
              )}
            >
              {campaign.status === "Active" ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Active
                </>
              ) : (
                <>
                  <Play className="h-3 w-3" />
                  Run
                </>
              )}
            </button>
          )}
        </div>
      </div>

      <p className="mt-1 text-[0.65rem] uppercase tracking-[0.28em] text-foreground/45">
        Last run · {lastRunLabel}
      </p>

      <div className="mt-1 flex flex-1 overflow-x-auto py-2 px-1">
        {campaign.stages.map((stage, stageIndex) => {
          const isLastStage = stageIndex === campaign.stages.length - 1;
          return (
            <>
              <div key={stage.id} className="relative w-[200px] flex-shrink-0" style={{ marginLeft: stageIndex === 0 ? '2px' : '4px' }}>
                <StageCard
                  stage={stage}
                  index={stageIndex}
                  isSelected={selectedStageId === stage.id}
                  onSelect={() => onSelectStage(campaign.id, stage)}
                />
                {isLastStage && campaign.stages.length > 0 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveStage(campaign.id, stage.id);
                    }}
                    className="absolute bottom-2 right-2 flex h-6 w-6 items-center justify-center rounded-full border border-primary bg-surface-base text-primary shadow-md hover:text-primary hover:border-2 transition-all z-10 group"
                    title="Remove stage"
                  >
                    <X className="h-3 w-3 group-hover:stroke-[2.5]" />
                  </button>
                )}
              </div>
              {stageIndex < campaign.stages.length - 1 && (
                <div key={`arrow-${stageIndex}`} className="flex items-center justify-center flex-shrink-0 px-1">
                  <ArrowRight className="h-3 w-3 text-foreground/30" />
                </div>
              )}
            </>
          );
        })}

        {canAddStage && (
          <>
            {campaign.stages.length > 0 && (
              <div className="flex items-center justify-center flex-shrink-0 px-1">
                <ArrowRight className="h-3 w-3 text-foreground/30" />
              </div>
            )}
            <div className="ml-2">
              <button
                type="button"
                onClick={() => onAddStage(campaign.id)}
                className="flex min-w-[200px] h-32 rounded-xl items-center justify-center gap-2 border border-dashed border-foreground/30 px-4 text-sm font-light text-foreground transition hover:border-foreground/70 hover:bg-foreground/10"
              >
                <Plus className="h-4 w-4" />
                Add stage
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

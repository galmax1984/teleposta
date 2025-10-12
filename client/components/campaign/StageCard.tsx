import { cn } from "@/lib/utils";
import {
  Stage,
  StageType,
  getStageHeadline,
  getStageSupportingText,
  getStageTitle,
} from "./types";
import { CheckCircle2, CircleDashed, Instagram, MessageCircle, Grid3X3, Timer } from "lucide-react";

const accentBorder: Record<StageType, string> = {
  source: "border-stage-source/70 bg-stage-source/10",
  scheduler: "border-stage-scheduler/60 bg-stage-scheduler/10",
  target: "border-stage-target/60 bg-stage-target/10",
};

const accentGlow: Record<StageType, string> = {
  source: "",
  scheduler: "",
  target: "",
};

const selectedAccent: Record<StageType, string> = {
  source: "ring-primary/70 bg-stage-source/20",
  scheduler: "ring-stage-scheduler/70 bg-stage-scheduler/20",
  target: "ring-stage-target/70 bg-stage-target/20",
};

const hoverAccent: Record<StageType, string> = {
  source: "hover:border-stage-source/60 hover:bg-stage-source/15",
  scheduler: "hover:border-stage-scheduler/60 hover:bg-stage-scheduler/15",
  target: "hover:border-stage-target/60 hover:bg-stage-target/15",
};

const statusTint: Record<StageType, string> = {
  source: "text-stage-source",
  scheduler: "text-stage-scheduler",
  target: "text-stage-target",
};

const getStageContentIcon = (stage: Stage) => {
  switch (stage.type) {
    case "source":
      if (stage.config.sourceType === "Airtable") {
        return <Grid3X3 className="h-3 w-3" />;
      }
      // Default for Spreadsheet (Google Sheets)
      return <Grid3X3 className="h-3 w-3" />;
    case "scheduler":
      return <Timer className="h-3 w-3" />;
    case "target":
      if (stage.config.channel === "Instagram") {
        return <Instagram className="h-3 w-3" />;
      } else if (stage.config.channel === "Telegram") {
        return <MessageCircle className="h-3 w-3" />;
      }
      return null;
    default:
      return null;
  }
};

interface StageCardProps {
  stage: Stage;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
}

export const StageCard = ({ stage, index, isSelected, onSelect }: StageCardProps) => {
  const statusIcon = stage.completed ? (
    <CheckCircle2 className={cn("h-3 w-3", statusTint[stage.type])} aria-hidden="true" />
  ) : (
    <CircleDashed className="h-3 w-3 text-foreground/50" aria-hidden="true" />
  );

  const statusLabel = stage.completed ? "Ready" : "Pending";
  const contentIcon = getStageContentIcon(stage);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "group relative flex w-full h-32 flex-col rounded-xl border text-left transition-all",
        "p-2 backdrop-blur-sm min-w-[200px]",
        accentBorder[stage.type],
        accentGlow[stage.type],
        isSelected ? cn("ring-2", selectedAccent[stage.type]) : hoverAccent[stage.type],
      )}
    >
      <div className="flex items-center rounded-sm justify-between text-[0.65rem] uppercase tracking-wide text-foreground/70">
        <span className={cn(
          "px-1.5 py-0.5 rounded-xl text-[0.5rem] font-light uppercase tracking-wide",
          stage.type === "source" ? "bg-stage-source/20 text-stage-source" :
          stage.type === "scheduler" ? "bg-stage-scheduler/20 text-stage-scheduler" :
          "bg-stage-target/20 text-stage-target"
        )}>
          {getStageTitle(stage.type)}
        </span>
        <span className="flex items-center gap-0.5 font-normal text-[0.6rem]">
          {statusIcon}
          <span>{statusLabel}</span>
        </span>
      </div>
      <div className="mt-1.5 flex items-center gap-1.5 text-sm font-normal text-foreground">
        {contentIcon}
        <span>{getStageHeadline(stage)}</span>
      </div>
      <p className="mt-1 text-xs font-normal text-foreground/70">
        {getStageSupportingText(stage)}
      </p>
    </button>
  );
};

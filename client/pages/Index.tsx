import { useEffect, useMemo, useState } from "react";
import { CampaignBoard } from "@/components/campaign/CampaignBoard";
import { StageSettingsPanel } from "@/components/campaign/StageSettingsPanel";
import {
  Campaign,
  MAX_CAMPAIGNS,
  Stage,
  createCampaign,
  createStage,
  getNextStageType,
  getStageHeadline,
  getStageTitle,
  isCampaignReady,
  isStageConfigComplete,
} from "@/components/campaign/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const buildDefaultCampaigns = (): Campaign[] => [createCampaign(1), createCampaign(2)];

export default function Index() {
  const [campaigns, setCampaigns] = useState<Campaign[]>(() => buildDefaultCampaigns());
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [selectedStageId, setSelectedStageId] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedCampaignId && campaigns.length > 0) {
      setSelectedCampaignId(campaigns[0].id);
    }
  }, [campaigns, selectedCampaignId]);

  const selectedCampaign = useMemo(
    () => campaigns.find((campaign) => campaign.id === selectedCampaignId) ?? null,
    [campaigns, selectedCampaignId],
  );

  const selectedStage = useMemo(
    () => selectedCampaign?.stages.find((stage) => stage.id === selectedStageId) ?? null,
    [selectedCampaign, selectedStageId],
  );

  const handleSelectStage = (campaignId: string, stage: Stage) => {
    setSelectedCampaignId(campaignId);
    setSelectedStageId(stage.id);
  };

  const handleAddCampaign = () => {
    if (campaigns.length >= MAX_CAMPAIGNS) return;
    const nextCampaign = createCampaign(campaigns.length + 1);
    setCampaigns((previous) => [...previous, nextCampaign]);
    setSelectedCampaignId(nextCampaign.id);
    setSelectedStageId(null);
  };

  const handleRenameCampaign = (campaignId: string, name: string) => {
    setCampaigns((previous) =>
      previous.map((campaign) =>
        campaign.id === campaignId
          ? {
              ...campaign,
              name,
            }
          : campaign,
      ),
    );
  };

  const handleAddStage = (campaignId: string) => {
    let createdStage: Stage | null = null;

    setCampaigns((previous) =>
      previous.map((campaign) => {
        if (campaign.id !== campaignId) return campaign;
        const nextType = getNextStageType(campaign.stages);
        if (!nextType) return campaign;
        if (campaign.stages.length > 0) {
          const lastStage = campaign.stages[campaign.stages.length - 1];
          if (!lastStage.completed || !isStageConfigComplete(lastStage)) {
            return campaign;
          }
        }
        const stage = createStage(nextType);
        createdStage = stage;
        return {
          ...campaign,
          stages: [...campaign.stages, stage],
        };
      }),
    );

    if (createdStage) {
      setSelectedCampaignId(campaignId);
      setSelectedStageId(createdStage.id);
    }
  };

  const handleSaveStage = async (campaignId: string, stageId: string, nextStage: Stage) => {
    const normalizedStage: Stage = {
      ...nextStage,
      completed: isStageConfigComplete(nextStage),
    };

    // Persist to backend: save stage by campaign name with full stage config
    try {
      const campaignName = campaigns.find(c => c.id === campaignId)?.name || "Campaign";
      await fetch("http://localhost:3001/api/campaigns/save-stage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignName,
          stage: normalizedStage,
        }),
      });
    } catch (error) {
      console.error("Failed to persist stage:", error);
      toast.error("Failed to save stage to server");
    }

    setCampaigns((previous) =>
      previous.map((campaign) => {
        if (campaign.id !== campaignId) return campaign;
        return {
          ...campaign,
          stages: campaign.stages.map((stage) => (stage.id === stageId ? normalizedStage : stage)),
        };
      }),
    );

    setSelectedCampaignId(campaignId);
    setSelectedStageId(stageId);
    toast.success("Stage saved", {
      description: `${normalizedStage.completed ? "Ready" : "Draft"} · ${normalizedStage.config && "Updated configuration"}`,
    });
  };

  const handleRunCampaign = (campaignId: string) => {
    setCampaigns((previous) =>
      previous.map((campaign) => {
        if (campaign.id !== campaignId) return campaign;
        
        // Toggle status between Pending and Active
        const newStatus = campaign.status === "Active" ? "Pending" : "Active";
        const runTimestamp = newStatus === "Active" ? new Date().toISOString() : campaign.lastRunAt;
        
        return {
          ...campaign,
          lastRunAt: runTimestamp,
          status: newStatus,
        };
      }),
    );

    // Find the campaign to get its name and new status for the toast
    const campaign = campaigns.find(c => c.id === campaignId);
    const campaignName = campaign?.name || "Campaign";
    const newStatus = campaign?.status === "Active" ? "Pending" : "Active";

    if (newStatus === "Active") {
      toast.success("Campaign activated", {
        description: `${campaignName} is now active and running.`,
      });
    } else {
      toast.success("Campaign deactivated", {
        description: `${campaignName} has been set to pending.`,
      });
    }
  };

  const handleRemoveStage = (campaignId: string, stageId: string) => {
    setCampaigns((previous) =>
      previous.map((campaign) => {
        if (campaign.id !== campaignId) return campaign;
        
        const stageToRemove = campaign.stages.find(s => s.id === stageId);
        const updatedStages = campaign.stages.filter(stage => stage.id !== stageId);
        
        return {
          ...campaign,
          stages: updatedStages,
        };
      }),
    );

    // Clear selection if the removed stage was selected
    if (selectedStageId === stageId) {
      setSelectedStageId(null);
    }

    toast.success("Stage removed", {
      description: "The stage has been successfully removed from the campaign.",
    });
  };

  const activeCampaigns = campaigns.length;
  const readyCampaigns = campaigns.filter(isCampaignReady).length;
  const configuredStages = campaigns.reduce((total, campaign) => total + campaign.stages.length, 0);

  return (
    <main className="relative h-full overflow-hidden bg-background text-foreground flex flex-col">
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-70">
        <div className="absolute -top-48 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-stage-source/20 blur-3xl" />
        <div className="absolute bottom-0 right-[-220px] h-[420px] w-[420px] rounded-full bg-stage-target/25 blur-3xl" />
      </div>

      <div className="flex w-full flex-col flex-1 min-h-0">
        <header className="w-full px-6 py-2 lg:px-10 flex-shrink-0">

          {/* <aside className="space-y-4 rounded-3xl border border-border/60 bg-surface-subtle/70 p-6 shadow-[0_25px_70px_-45px_rgba(0,0,0,0.8)] backdrop-blur">
            <h2 className="text-lg font-semibold text-foreground">How it works</h2>
            <ol className="space-y-3 text-sm text-foreground/70">
              <li>
                <strong className="text-foreground">Source</strong> your contacts from Airtable or spreadsheets.
              </li>
              <li>
                <strong className="text-foreground">Schedule</strong> at fixed hours or rolling cadences.
              </li>
              <li>
                <strong className="text-foreground">Target</strong> Instagram or Telegram with ready-to-launch assets.
              </li>
            </ol>
            <p className="rounded-2xl bg-foreground/5 px-4 py-3 text-xs text-foreground/60">
              Tip: complete a stage to unlock the next, and look for the green “Run campaign” button when all three are configured.
            </p>
          </aside> */}
        </header>

        <section className="grid grid-cols-[1fr_0.9fr] flex-1 min-h-0 w-full">
          <div className="flex flex-col pl-2 pr-3 py-2 min-h-0">
            <CampaignBoard
              campaigns={campaigns}
              selectedCampaignId={selectedCampaignId}
              selectedStageId={selectedStageId}
              onSelectStage={handleSelectStage}
              onAddStage={handleAddStage}
              onAddCampaign={handleAddCampaign}
              onRenameCampaign={handleRenameCampaign}
              onRunCampaign={handleRunCampaign}
              onRemoveStage={handleRemoveStage}
            />
          </div>
          <div className="flex flex-col pl-3 pr-2 py-2 min-h-0">
            <StageSettingsPanel
              campaign={selectedCampaign}
              stage={selectedStage}
              onSaveStage={handleSaveStage}
            />
          </div>
        </section>
      </div>
    </main>
  );
}

const toneClass: Record<"source" | "scheduler" | "target", string> = {
  source: "from-stage-source/90 via-stage-source/60 to-stage-source/30 text-slate-950",
  scheduler: "from-stage-scheduler/90 via-stage-scheduler/60 to-stage-scheduler/30 text-zinc-900",
  target: "from-stage-target/90 via-stage-target/60 to-stage-target/30 text-zinc-900",
};

const StatPill = ({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: keyof typeof toneClass;
}) => (
  <div
    className={cn(
      "flex min-w-[160px] flex-col rounded-2xl border border-foreground/10 bg-gradient-to-br px-5 py-4 shadow-[0_15px_45px_-35px_rgba(0,0,0,0.8)]",
      toneClass[tone],
    )}
  >
    <span className="text-xs uppercase tracking-[0.3em] text-foreground/70">{label}</span>
    <span className="mt-2 text-2xl font-semibold text-foreground">{value}</span>
  </div>
);

const STAGE_LABELS = ["Source", "Scheduler", "Target"];

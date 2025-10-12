import { CampaignRow } from "./CampaignRow";
import { Campaign, MAX_CAMPAIGNS, Stage, canAddStage } from "./types";
import { Plus } from "lucide-react";

interface CampaignBoardProps {
  campaigns: Campaign[];
  selectedCampaignId: string | null;
  selectedStageId: string | null;
  onSelectStage: (campaignId: string, stage: Stage) => void;
  onAddStage: (campaignId: string) => void;
  onAddCampaign: () => void;
  onRenameCampaign: (campaignId: string, name: string) => void;
  onRunCampaign: (campaignId: string) => void;
  onRemoveStage: (campaignId: string, stageId: string) => void;
}

export const CampaignBoard = ({
  campaigns,
  selectedCampaignId,
  selectedStageId,
  onSelectStage,
  onAddStage,
  onAddCampaign,
  onRenameCampaign,
  onRunCampaign,
  onRemoveStage,
}: CampaignBoardProps) => {
  const canAppendCampaign = campaigns.length < MAX_CAMPAIGNS;

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto">
        {campaigns.map((campaign, index) => (
          <CampaignRow
            key={campaign.id}
            campaign={campaign}
            index={index}
            selectedStageId={selectedCampaignId === campaign.id ? selectedStageId : null}
            onSelectStage={onSelectStage}
            onAddStage={onAddStage}
            canAddStage={canAddStage(campaign.stages)}
            onRenameCampaign={onRenameCampaign}
            onRunCampaign={onRunCampaign}
            onRemoveStage={onRemoveStage}
          />
        ))}

        {canAppendCampaign && (
          <button
            type="button"
            onClick={onAddCampaign}
            className="flex h-24 w-full items-center justify-center rounded-3xl border border-dashed border-primary bg-primary/10 text-sm font-semibold text-primary transition hover:border-primary hover:bg-primary/20"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full border border-primary">
                <Plus className="h-4 w-4" />
              </span>
              <span>Add campaign</span>
            </div>
          </button>
        )}
      </div>
    </div>
  );
};

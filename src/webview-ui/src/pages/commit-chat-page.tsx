import React from "react";
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";
import CommitChatView from "@/components/commit-chat/CommitChatView";

interface CommitChatPageProps {
  onOpenSettings?: () => void;
}

const CommitChatPage: React.FC<CommitChatPageProps> = ({ onOpenSettings }) => (
  <div className="flex flex-col h-screen">
    <div className="flex items-center justify-between p-4 border-b bg-card">
      <div className="font-semibold">Commit Chat</div>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => onOpenSettings?.()}
        aria-label="Open Settings"
        disabled={!onOpenSettings}
      >
        <Settings className="w-4 h-4" />
      </Button>
    </div>

    <div className="flex-1 p-4 overflow-hidden">
      <CommitChatView className="h-full" showHeader={false} />
    </div>
  </div>
);

export default CommitChatPage;

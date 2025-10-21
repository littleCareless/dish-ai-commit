import React, { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";
import CommitChatView from "@/components/commit-chat/CommitChatView";
import CommitPreview from "@/components/commit-chat/CommitPreview";

interface CommitChatPageProps {
  onOpenSettings?: () => void;
}

const CommitChatPage: React.FC<CommitChatPageProps> = ({ onOpenSettings }) => {
  const [commitMessage, setCommitMessage] = useState("");
  const [style, setStyle] = useState<"conventional" | "descriptive" | "emoji" | "minimal">("conventional");
  const [language, setLanguage] = useState<"zh" | "en">("zh");
  const [maxLength, setMaxLength] = useState<number>(50);

  const handleCommitMessageGenerated = useCallback((message: string) => {
    setCommitMessage(message || "");
  }, []);

  const handleConfigurationChanged = useCallback((config: Record<string, unknown>) => {
    if (typeof config.style === "string") {
      const next = config.style as "conventional" | "descriptive" | "emoji" | "minimal";
      setStyle(next);
    }
    if (typeof config.language === "string") {
      const next = config.language as "zh" | "en";
      setLanguage(next);
    }
    if (typeof config.maxLength === "number") {
      setMaxLength(config.maxLength as number);
    }
  }, []);

  return (
    <div className="flex flex-col h-screen">
      <div className="flex items-center justify-between p-4 border-b bg-card">
        <div className="font-semibold">Commit Chat</div>
        <Button size="sm" variant="ghost" onClick={onOpenSettings} aria-label="Open Settings">
          <Settings className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 p-4 overflow-hidden">
        <div className="h-full overflow-hidden">
          <CommitChatView
            onCommitMessageGenerated={handleCommitMessageGenerated}
            onConfigurationChanged={handleConfigurationChanged}
            className="h-full"
          />
        </div>
        <div className="h-full overflow-auto">
          <CommitPreview
            commitMessage={commitMessage}
            style={style}
            language={language}
            maxLength={maxLength}
            onStyleChange={(v) => setStyle(v as "conventional" | "descriptive" | "emoji" | "minimal")}
            onLanguageChange={(v) => setLanguage(v as "zh" | "en")}

            onMaxLengthChange={(v) => setMaxLength(v)}
            onRegenerate={() => {/* placeholder for regenerate action */}}
            onCopy={() => {/* noop */}}
            className="h-full"
          />
        </div>
      </div>
    </div>
  );
};

export default CommitChatPage;

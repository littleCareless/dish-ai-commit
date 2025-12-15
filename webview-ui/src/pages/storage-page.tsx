import { PageHeader, PageLayout } from "@/components/layout/PageLayout";
import { Button } from "@/components/ui/button";
import { postMessage, useMessageHandler } from "@/utils/vscode";
import { ExtensionResponse, UIRequest } from "@shared/types/messages";
import React, { useEffect, useState } from "react";

export const StoragePage: React.FC = () => {
  const [storageData, setStorageData] = useState<object | null>(null);

  useEffect(() => {
    // Request all storage data when the component mounts
    postMessage(UIRequest.SystemGetAllStorage);
  }, []);

  useMessageHandler((event: MessageEvent) => {
    const { command, data } = event.data;
    if (command === ExtensionResponse.SystemAllStorageLoaded) {
      setStorageData(data);
    } else if (command === ExtensionResponse.SystemStorageCleared) {
      if (data.success) {
        // Data is cleared, and VS Code will reload, so we just need to refresh the view
        setStorageData({});
        alert("所有存储已成功清空,VS Code 将会自动重载。");
      } else {
        alert(`清空存储失败: ${data.error}`);
      }
    }
  });

  const handleClearAllStorage = () => {
    postMessage(UIRequest.SystemClearAllStorage);
  };

  return (
    <PageLayout
      maxWidth="4xl"
      className="h-full"
      contentClassName="h-full flex flex-col"
    >
      <PageHeader
        title="插件存储信息"
        description="以下是此插件在您的 VS Code 中存储的所有数据，包括全局状态、工作区状态和密钥。"
        actions={
          <Button
            variant="destructive"
            size="sm"
            onClick={handleClearAllStorage}
          >
            清空所有存储
          </Button>
        }
      />
      <div className="flex-1 bg-vscode-editor-background p-4 rounded-md border border-vscode-panel-border overflow-auto">
        <pre className="text-sm whitespace-pre-wrap break-all">
          {JSON.stringify(storageData, null, 2)}
        </pre>
      </div>
    </PageLayout>
  );
};

import { Button } from "@/components/ui/button";
import { postMessage, useMessageHandler } from "@/utils/vscode";
import React, { useEffect, useState } from "react";

export const StoragePage: React.FC = () => {
  const [storageData, setStorageData] = useState<object | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Request all storage data when the component mounts
    postMessage("getAllStorage");
  }, []);

  useMessageHandler((event: MessageEvent) => {
    const { command, data } = event.data;
    if (command === "getAllStorageResponse") {
      setStorageData(data);
      setIsLoading(false);
    } else if (command === "clearAllStorageResponse") {
      if (data.success) {
        // Data is cleared, and VS Code will reload, so we just need to refresh the view
        setStorageData({});
        alert("所有存储已成功清空，VS Code 将会自动重载。");
      } else {
        alert(`清空存储失败: ${data.error}`);
      }
    }
  });

  const handleClearAllStorage = () => {
    postMessage("clearAllStorage");
  };

  return (
    <div className="p-6 h-full flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">插件存储信息</h1>
        <Button variant="destructive" size="sm" onClick={handleClearAllStorage}>
          清空所有存储
        </Button>
      </div>
      <p className="text-muted-foreground mb-6">
        以下是此插件在您的 VS Code
        中存储的所有数据，包括全局状态、工作区状态和密钥。
      </p>
      <div className="flex-1 bg-vscode-editor-background p-4 rounded-md border border-vscode-panel-border overflow-auto">
        {isLoading ? (
          <p>正在加载存储数据...</p>
        ) : (
          <pre className="text-sm whitespace-pre-wrap break-all">
            {JSON.stringify(storageData, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
};

/**
 * Ollama 模型发现组件
 * 用于发现本地 Ollama 服务器上的可用模型
 */

import { CheckCircle, RefreshCw, XCircle } from "lucide-react";
import React, { useState } from "react";
import { FieldRendererProps } from "../../types/provider-metadata";
import { Button } from "../ui/button";

interface OllamaModelDiscoveryProps extends FieldRendererProps {
  onModelsDiscovered?: (models: string[]) => void;
}

export const OllamaModelDiscovery: React.FC<OllamaModelDiscoveryProps> = ({
  value,
  disabled = false,
  onModelsDiscovered,
}) => {
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [discoveryResult, setDiscoveryResult] = useState<
    "success" | "error" | null
  >(null);
  const [discoveredModels, setDiscoveredModels] = useState<string[]>([]);

  const handleDiscoverModels = async () => {
    setIsDiscovering(true);
    setDiscoveryResult(null);

    try {
      // 发送消息到扩展后端
      const vscodeApi = (window as any).acquireVsCodeApi?.();
      if (!vscodeApi) {
        throw new Error("VSCode API 不可用");
      }

      vscodeApi.postMessage({
        command: "discoverOllamaModels",
        data: {
          baseURL: value?.baseURL || "http://localhost:11434",
        },
      });

      // 设置超时以等待响应
      const handleMessage = (event: any) => {
        const message = event.data;
        if (message.command === "ollamaModelsDiscovered") {
          window.removeEventListener("message", handleMessage);
          setIsDiscovering(false);

          if (message.data.success) {
            const models = message.data.models || [];
            setDiscoveredModels(models);
            setDiscoveryResult("success");
            onModelsDiscovered?.(models);
          } else {
            setDiscoveryResult("error");
          }
        }
      };

      window.addEventListener("message", handleMessage);

      // 30秒超时
      setTimeout(() => {
        window.removeEventListener("message", handleMessage);
        if (isDiscovering) {
          setIsDiscovering(false);
          setDiscoveryResult("error");
        }
      }, 30000);
    } catch (error) {
      setIsDiscovering(false);
      setDiscoveryResult("error");
      console.error("模型发现失败:", error);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Button
          onClick={handleDiscoverModels}
          disabled={disabled || isDiscovering}
          variant="outline"
          size="sm"
        >
          {isDiscovering ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              发现中...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4 mr-2" />
              发现模型
            </>
          )}
        </Button>

        {discoveryResult === "success" && (
          <div className="flex items-center gap-1 text-green-600">
            <CheckCircle className="w-4 h-4" />
            <span className="text-sm">
              发现 {discoveredModels.length} 个模型
            </span>
          </div>
        )}

        {discoveryResult === "error" && (
          <div className="flex items-center gap-1 text-red-600">
            <XCircle className="w-4 h-4" />
            <span className="text-sm">发现失败</span>
          </div>
        )}
      </div>

      {discoveredModels.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">发现的模型:</p>
          <div className="max-h-32 overflow-y-auto space-y-1">
            {discoveredModels.map((model, index) => (
              <div
                key={index}
                className="text-xs bg-muted px-2 py-1 rounded font-mono"
              >
                {model}
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-sm text-muted-foreground">
        自动发现您 Ollama 安装中的可用模型。
      </p>
    </div>
  );
};

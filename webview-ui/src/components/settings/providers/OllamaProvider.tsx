import React, { useState } from "react";
import { ProviderConfig } from "../../../types/settings";
import { ProviderBase } from "./ProviderBase";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Info, RefreshCw } from "lucide-react";

interface OllamaProviderProps {
  config: ProviderConfig;
  onChange: (config: ProviderConfig) => void;
  onTest?: () => Promise<boolean>;
  className?: string;
}

export const OllamaProvider: React.FC<OllamaProviderProps> = ({
  config,
  onChange,
  onTest,
  className = "",
}) => {
  const [isDiscovering, setIsDiscovering] = useState(false);

  const handleBaseUrlChange = (value: string) => {
    onChange({
      ...config,
      baseURL: value,
    });
  };

  const handleDiscoverModels = async () => {
    setIsDiscovering(true);
    try {
      // This would typically call the backend to discover models
      // For now, we'll just simulate the process
      await new Promise((resolve) => setTimeout(resolve, 2000));
      // TODO: Implement model discovery
    } catch (error) {
      console.error("Model discovery failed:", error);
    } finally {
      setIsDiscovering(false);
    }
  };

  const defaultBaseUrl = config.baseURL || "http://localhost:11434";

  return (
    <div className={className}>
      <ProviderBase config={config} onChange={onChange} onTest={onTest} />

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="w-4 h-4" />
            Ollama Specific Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Base URL */}
          <div className="space-y-2">
            <Label htmlFor={`${config.id}-base-url`}>Ollama Server URL</Label>
            <Input
              id={`${config.id}-base-url`}
              type="url"
              value={defaultBaseUrl}
              onChange={(e) =>
                handleBaseUrlChange((e.target as HTMLInputElement)?.value || "")
              }
              placeholder="http://localhost:11434"
            />
            <p className="text-sm text-muted-foreground">
              The URL where your Ollama server is running. Default is
              localhost:11434.
            </p>
          </div>

          {/* Model Discovery */}
          <div className="space-y-2">
            <Label>Model Discovery</Label>
            <Button
              onClick={handleDiscoverModels}
              disabled={isDiscovering}
              variant="outline"
              size="sm"
            >
              {isDiscovering ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Discovering...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Discover Models
                </>
              )}
            </Button>
            <p className="text-sm text-muted-foreground">
              Automatically discover available models from your Ollama
              installation.
            </p>
          </div>

          {/* Documentation Link */}
          <div className="text-sm">
            <a
              href="https://ollama.ai/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 underline"
            >
              View Ollama Documentation
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

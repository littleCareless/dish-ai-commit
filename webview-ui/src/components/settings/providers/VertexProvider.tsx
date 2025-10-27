import React, { useState } from "react";
import { ProviderConfig } from "../../../types/settings";
import { ProviderBase } from "./ProviderBase";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Info } from "lucide-react";

interface VertexProviderProps {
  config: ProviderConfig;
  onChange: (config: ProviderConfig) => void;
  onTest?: () => Promise<boolean>;
  className?: string;
}

export const VertexProvider: React.FC<VertexProviderProps> = ({
  config,
  onChange,
  onTest,
  className = "",
}) => {
  const [projectId, setProjectId] = useState(config.projectId || "");
  const [region, setRegion] = useState(config.region || "us-central1");

  const handleProjectIdChange = (value: string) => {
    setProjectId(value);
    onChange({
      ...config,
      projectId: value,
    });
  };

  const handleRegionChange = (value: string) => {
    setRegion(value);
    onChange({
      ...config,
      region: value,
    });
  };

  return (
    <div className={className}>
      <ProviderBase config={config} onChange={onChange} onTest={onTest} />

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="w-4 h-4" />
            Google Vertex AI Specific Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor={`${config.id}-project-id`}>Project ID</Label>
            <Input
              id={`${config.id}-project-id`}
              type="text"
              value={projectId}
              onChange={(e) =>
                handleProjectIdChange(
                  (e.target as HTMLInputElement)?.value || "",
                )
              }
              placeholder="your-project-id"
            />
            <p className="text-sm text-muted-foreground">
              Your Google Cloud project ID where Vertex AI is enabled.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${config.id}-region`}>Region</Label>
            <Input
              id={`${config.id}-region`}
              type="text"
              value={region}
              onChange={(e) =>
                handleRegionChange((e.target as HTMLInputElement)?.value || "")
              }
              placeholder="us-central1"
            />
            <p className="text-sm text-muted-foreground">
              The Google Cloud region where your Vertex AI service is available.
            </p>
          </div>
          <div className="text-sm">
            <a
              href="https://cloud.google.com/vertex-ai/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 underline"
            >
              View Vertex AI Documentation
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

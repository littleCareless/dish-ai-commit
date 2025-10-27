import React, { useState } from "react";
import { ProviderConfig } from "../../../types/settings";
import { ProviderBase } from "./ProviderBase";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Info } from "lucide-react";

interface OpenAIProviderProps {
  config: ProviderConfig;
  onChange: (config: ProviderConfig) => void;
  onTest?: () => Promise<boolean>;
  className?: string;
}

export const OpenAIProvider: React.FC<OpenAIProviderProps> = ({
  config,
  onChange,
  onTest,
  className = "",
}) => {
  const [organizationId, setOrganizationId] = useState(
    config.organization || "",
  );

  const handleOrganizationChange = (value: string) => {
    setOrganizationId(value);
    onChange({
      ...config,
      organization: value,
    });
  };

  return (
    <div className={className}>
      <ProviderBase config={config} onChange={onChange} onTest={onTest} />

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="w-4 h-4" />
            OpenAI Specific Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Organization ID */}
          <div className="space-y-2">
            <Label htmlFor={`${config.id}-organization`}>
              Organization ID (Optional)
            </Label>
            <Input
              id={`${config.id}-organization`}
              type="text"
              value={organizationId}
              onChange={(e) =>
                handleOrganizationChange(
                  (e.target as HTMLInputElement)?.value || "",
                )
              }
              placeholder="org-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
            />
            <p className="text-sm text-muted-foreground">
              Required for organizations with multiple users. You can find this
              in your OpenAI dashboard.
            </p>
          </div>

          {/* API Documentation Link */}
          <div className="text-sm">
            <a
              href="https://platform.openai.com/docs/api-reference"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 underline"
            >
              View OpenAI API Documentation
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

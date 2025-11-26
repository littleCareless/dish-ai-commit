import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ProviderConfig } from "@/types/settings";
import { CheckCircle, Loader2, XCircle } from "lucide-react";
import React, { useState } from "react";

interface ProviderBaseProps {
  config: ProviderConfig;
  onChange: (config: ProviderConfig) => void;
  onTest?: () => Promise<boolean>;
  className?: string;
}

export const ProviderBase: React.FC<ProviderBaseProps> = ({
  config,
  onChange,
  onTest,
  className = "",
}) => {
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<"success" | "error" | null>(
    null,
  );

  const handleApiKeyChange = (value: string) => {
    onChange({
      ...config,
      apiKey: value,
    });
  };

  const handleBaseUrlChange = (value: string) => {
    onChange({
      ...config,
      baseURL: value,
    });
  };

  const handleTestConnection = async () => {
    if (!onTest) return;

    setIsTesting(true);
    setTestResult(null);

    try {
      const success = await onTest();
      setTestResult(success ? "success" : "error");
    } catch (error) {
      setTestResult("error");
      console.error("Connection test failed:", error);
    } finally {
      setIsTesting(false);
    }
  };

  const getProviderTypeColor = (type: string) => {
    switch (type) {
      case "first-party":
        return "bg-blue-100 text-blue-800";
      case "aggregator":
        return "bg-purple-100 text-purple-800";
      case "local":
        return "bg-green-100 text-green-800";
      case "cloud":
        return "bg-orange-100 text-orange-800";
      case "openai-compatible":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            {config.name}
            <Badge className={getProviderTypeColor(config.type)}>
              {config.type.replace("-", " ")}
            </Badge>
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* API Key */}
        <div className="space-y-2">
          <Label htmlFor={`${config.id}-api-key`}>
            API Key
            {config.type !== "local" && (
              <span className="text-red-500 ml-1">*</span>
            )}
          </Label>
          <Input
            id={`${config.id}-api-key`}
            type="password"
            value={config.apiKey || ""}
            onChange={(e) =>
              handleApiKeyChange((e.target as HTMLInputElement)?.value || "")
            }
            placeholder={
              config.type === "local"
                ? "Optional for local providers"
                : "Enter your API key"
            }
            disabled={config.type === "local"}
          />
        </div>

        {/* Base URL */}
        <div className="space-y-2">
          <Label htmlFor={`${config.id}-base-url`}>Base URL</Label>
          <Input
            id={`${config.id}-base-url`}
            type="url"
            value={config.baseURL || ""}
            onChange={(e) =>
              handleBaseUrlChange((e.target as HTMLInputElement)?.value || "")
            }
            placeholder="https://api.example.com/v1"
          />
        </div>

        {/* Connection Test */}
        {onTest && (
          <div className="flex items-center gap-2">
            <Button
              onClick={handleTestConnection}
              disabled={isTesting || !config.apiKey}
              variant="outline"
              size="sm"
            >
              {isTesting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Testing...
                </>
              ) : (
                "Test Connection"
              )}
            </Button>
            {testResult === "success" && (
              <div className="flex items-center gap-1 text-green-600">
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm">Connected</span>
              </div>
            )}
            {testResult === "error" && (
              <div className="flex items-center gap-1 text-red-600">
                <XCircle className="w-4 h-4" />
                <span className="text-sm">Connection Failed</span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

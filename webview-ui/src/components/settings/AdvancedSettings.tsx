import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import React from "react";
import { UserPreferences } from "../../types/settings";
import { Skeleton } from "@/components/ui/skeleton";

interface AdvancedSettingsProps {
  preferences: UserPreferences;
  onChange: (preferences: UserPreferences) => void;
  className?: string;
  isLoading?: boolean;
}

const AdvancedSettingsSkeleton: React.FC = () => {
  const renderSliderCard = (titleWidth: string) => (
    <Card>
      <CardHeader>
        <CardTitle>
          <Skeleton className={`h-6 ${titleWidth}`} />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-6 w-40" />
          </div>
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-4 w-full" />
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {renderSliderCard("w-32")}
      {renderSliderCard("w-40")}
      {renderSliderCard("w-36")}

      {/* Skeleton for Advanced Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>
            <Skeleton className="h-6 w-48" />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-4 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-4 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-4 w-full" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export const AdvancedSettings: React.FC<AdvancedSettingsProps> = ({
  preferences,
  onChange,
  className = "",
  isLoading,
}) => {
  if (isLoading) {
    return <AdvancedSettingsSkeleton />;
  }
  const handleVerbosityChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const value = parseInt(event.target.value || "0");
    onChange({ ...preferences, verbosity: value });
  };

  const handleRateLimitChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const value = parseInt(event.target.value || "0");
    onChange({ ...preferences, rateLimitSeconds: value });
  };

  const handleMistakeLimitChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const value = parseInt(event.target.value || "0");
    onChange({ ...preferences, consecutiveMistakeLimit: value });
  };

  const handleMaxTokensChange = (event: React.FormEvent<HTMLElement>) => {
    const value = (event.target as HTMLInputElement)?.value || "";
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue) && numValue > 0) {
      onChange({ ...preferences, maxTokens: numValue });
    }
  };

  const handleTimeoutChange = (event: React.FormEvent<HTMLElement>) => {
    const value = (event.target as HTMLInputElement)?.value || "";
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue) && numValue > 0) {
      onChange({ ...preferences, timeout: numValue });
    }
  };

  const handleRetryAttemptsChange = (event: React.FormEvent<HTMLElement>) => {
    const value = (event.target as HTMLInputElement)?.value || "";
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue) && numValue > 0) {
      onChange({ ...preferences, retryAttempts: numValue });
    }
  };

  const getVerbosityDescription = (value: number) => {
    switch (value) {
      case 0:
        return "Minimal logging";
      case 1:
        return "Standard logging";
      case 2:
        return "Verbose logging";
      default:
        return "Unknown";
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Verbosity Control */}
      <Card>
        <CardHeader>
          <CardTitle>Logging Level</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Verbosity: {preferences.verbosity}</Label>
              <Badge variant="outline">
                {getVerbosityDescription(preferences.verbosity)}
              </Badge>
            </div>
            <Slider
              min={0}
              max={2}
              step={1}
              value={preferences.verbosity}
              onChange={handleVerbosityChange}
              className="w-full"
            />
            <p className="text-sm text-muted-foreground">
              Controls the detail level of logging and debug information.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Rate Limiting */}
      <Card>
        <CardHeader>
          <CardTitle>Rate Limiting</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>
              Delay Between Requests: {preferences.rateLimitSeconds}s
            </Label>
            <Slider
              min={0}
              max={60}
              step={1}
              value={preferences.rateLimitSeconds}
              onChange={handleRateLimitChange}
              className="w-full"
            />
            <p className="text-sm text-muted-foreground">
              Minimum delay between API requests to avoid rate limiting.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Retry Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Error Handling</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>
              Max Retry Attempts: {preferences.consecutiveMistakeLimit}
            </Label>
            <Slider
              min={1}
              max={10}
              step={1}
              value={preferences.consecutiveMistakeLimit}
              onChange={handleMistakeLimitChange}
              className="w-full"
            />
            <p className="text-sm text-muted-foreground">
              Maximum number of consecutive retry attempts before giving up.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Advanced Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Advanced Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Max Tokens */}
            <div className="space-y-2">
              <Label htmlFor="max-tokens">Max Tokens</Label>
              <Input
                type="text"
                value={preferences.maxTokens?.toString() || "4000"}
                onChange={handleMaxTokensChange}
                placeholder="4000"
              />
              <p className="text-sm text-muted-foreground">
                Maximum tokens for AI responses.
              </p>
            </div>

            {/* Timeout */}
            <div className="space-y-2">
              <Label htmlFor="timeout">Timeout (ms)</Label>
              <Input
                type="text"
                value={preferences.timeout?.toString() || "30000"}
                onChange={handleTimeoutChange}
                placeholder="30000"
              />
              <p className="text-sm text-muted-foreground">
                Request timeout in milliseconds.
              </p>
            </div>

            {/* Retry Attempts */}
            <div className="space-y-2">
              <Label htmlFor="retry-attempts">Retry Attempts</Label>
              <Input
                type="text"
                value={preferences.retryAttempts?.toString() || "3"}
                onChange={handleRetryAttemptsChange}
                placeholder="3"
              />
              <p className="text-sm text-muted-foreground">
                Number of retry attempts for failed requests.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

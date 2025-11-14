import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectOption } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Info } from "lucide-react";
import React from "react";
import { UserPreferences } from "../../types/settings";
import { Skeleton } from "@/components/ui/skeleton";

interface PreferencesSettingsProps {
  preferences: UserPreferences;
  onChange: (preferences: UserPreferences) => void;
  className?: string;
  isLoading?: boolean;
}

const PreferencesSettingsSkeleton: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Skeleton for Temperature Control */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Skeleton className="h-5 w-5" />
            <Skeleton className="h-5 w-48" />
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

      {/* Skeleton for Language */}
      <Card>
        <CardHeader>
          <CardTitle>
            <Skeleton className="h-6 w-32" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-4 w-full" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export const PreferencesSettings: React.FC<PreferencesSettingsProps> = ({
  preferences,
  onChange,
  className = "",
  isLoading,
}) => {
  if (isLoading) {
    return <PreferencesSettingsSkeleton />;
  }
  const handleTemperatureChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const value = parseFloat(event.target.value || "0");
    onChange({ ...preferences, temperature: value });
  };

  const handleLanguageChange = (event: React.FormEvent<HTMLElement>) => {
    const value = (event.target as HTMLSelectElement)?.value || "";
    onChange({ ...preferences, language: value });
  };

  const getTemperatureDescription = (value: number) => {
    if (value === 0) return "Deterministic (most focused)";
    if (value <= 0.5) return "Low creativity";
    if (value <= 1.0) return "Balanced";
    if (value <= 1.5) return "High creativity";
    return "Maximum creativity";
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Temperature Control */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="w-4 h-4" />
            Response Creativity
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Temperature: {preferences.temperature}</Label>
              <Badge variant="outline">
                {getTemperatureDescription(preferences.temperature)}
              </Badge>
            </div>
            <Slider
              min={0}
              max={2}
              step={0.1}
              value={preferences.temperature}
              onChange={handleTemperatureChange}
              className="w-full"
            />
            <p className="text-sm text-muted-foreground">
              Controls randomness in responses. Lower values make responses more
              focused and deterministic.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Language */}
      <Card>
        <CardHeader>
          <CardTitle>Language</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="language">Interface Language</Label>
            <Select
              value={preferences.language}
              onChange={handleLanguageChange}
            >
              <SelectOption value="Simplified Chinese">
                Simplified Chinese
              </SelectOption>
              <SelectOption value="Traditional Chinese">
                Traditional Chinese
              </SelectOption>
              <SelectOption value="Japanese">Japanese</SelectOption>
              <SelectOption value="Korean">Korean</SelectOption>
              <SelectOption value="Czech">Czech</SelectOption>
              <SelectOption value="German">German</SelectOption>
              <SelectOption value="French">French</SelectOption>
              <SelectOption value="Italian">Italian</SelectOption>
              <SelectOption value="Dutch">Dutch</SelectOption>
              <SelectOption value="Portuguese">Portuguese</SelectOption>
              <SelectOption value="Vietnamese">Vietnamese</SelectOption>
              <SelectOption value="English">English</SelectOption>
              <SelectOption value="Spanish">Spanish</SelectOption>
              <SelectOption value="Swedish">Swedish</SelectOption>
              <SelectOption value="Russian">Russian</SelectOption>
              <SelectOption value="Bahasa">Bahasa</SelectOption>
              <SelectOption value="Polish">Polish</SelectOption>
              <SelectOption value="Turkish">Turkish</SelectOption>
              <SelectOption value="Thai">Thai</SelectOption>
            </Select>
            <p className="text-sm text-muted-foreground">
              Choose your preferred language for the user interface.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

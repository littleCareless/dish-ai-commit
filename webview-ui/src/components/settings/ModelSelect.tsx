import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import React from "react";
import { ModelConfig } from "../../types/settings";

interface ModelSelectProps {
  models: ModelConfig[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export const ModelSelect: React.FC<ModelSelectProps> = ({
  models,
  value,
  onChange,
  placeholder = "Select a model...",
  className = "",
}) => {
  // Sort models: non-deprecated first, then by name
  const sortedModels = React.useMemo(() => {
    return [...models].sort((a, b) => {
      if (a.deprecated && !b.deprecated) return 1;
      if (!a.deprecated && b.deprecated) return -1;
      return a.name.localeCompare(b.name);
    });
  }, [models]);

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={className}>
        <SelectValue>
          {value
            ? models.find((m) => m.id === value)?.name || value
            : placeholder}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {sortedModels.map((model) => (
          <SelectItem key={model.id} value={model.id}>
            <div className="flex items-center justify-between w-full">
              <div className="flex flex-col items-start">
                <span className="font-medium">{model.name}</span>
                {model.id !== model.name && (
                  <span className="text-xs text-muted-foreground">
                    {model.id}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1 ml-2">
                {model.deprecated && (
                  <Badge variant="secondary" className="text-xs">
                    Deprecated
                  </Badge>
                )}
                {model.capabilities?.streaming && (
                  <Badge variant="outline" className="text-xs">
                    Streaming
                  </Badge>
                )}
                {model.capabilities?.functionCalling && (
                  <Badge variant="outline" className="text-xs">
                    Functions
                  </Badge>
                )}
              </div>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

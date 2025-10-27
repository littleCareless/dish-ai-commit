import React, { useState, useMemo } from 'react';
import { ModelConfig } from '../../types/settings';
import { Command, CommandInput, CommandList, CommandItem, CommandEmpty } from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Check, ChevronsUpDown, Plus } from 'lucide-react';

interface ModelPickerProps {
  models: ModelConfig[];
  selectedModel: string;
  onSelect: (modelId: string) => void;
  allowCustom?: boolean;
  organizationAllowList?: string[];
  className?: string;
  placeholder?: string;
}

export const ModelPicker: React.FC<ModelPickerProps> = ({
  models,
  selectedModel,
  onSelect,
  allowCustom = true,
  organizationAllowList = [],
  className = '',
  placeholder = 'Search models...',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filteredModels = useMemo(() => {
    let filtered = models;

    // Filter by organization if allowList is provided
    if (organizationAllowList.length > 0) {
      filtered = filtered.filter(() => {
        // This would need to be implemented based on your model structure
        // For now, we'll assume all models pass this filter
        return true;
      });
    }

    // Filter by search term
    if (search.trim()) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(model => 
        model.name.toLowerCase().includes(searchLower) ||
        model.id.toLowerCase().includes(searchLower)
      );
    }

    // Sort models: non-deprecated first, then by name
    filtered.sort((a, b) => {
      if (a.deprecated && !b.deprecated) return 1;
      if (!a.deprecated && b.deprecated) return -1;
      return a.name.localeCompare(b.name);
    });

    return filtered;
  }, [models, search, organizationAllowList]);

  const selectedModelConfig = models.find(model => model.id === selectedModel);

  const handleSelect = (modelId: string) => {
    onSelect(modelId);
    setIsOpen(false);
    setSearch('');
  };

  const handleCustomSelect = () => {
    if (search.trim()) {
      handleSelect(search.trim());
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={`w-full justify-between ${className}`}
        >
          <span className="truncate">
            {selectedModelConfig ? selectedModelConfig.name : 'Select model...'}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput
            placeholder={placeholder}
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>
              {search.trim() && allowCustom ? (
                <div className="p-2">
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={handleCustomSelect}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Use custom model: {search}
                  </Button>
                </div>
              ) : (
                'No models found.'
              )}
            </CommandEmpty>
            {filteredModels.map((model) => (
              <CommandItem
                key={model.id}
                value={model.id}
                onSelect={() => handleSelect(model.id)}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <Check
                    className={`h-4 w-4 ${
                      selectedModel === model.id ? 'opacity-100' : 'opacity-0'
                    }`}
                  />
                  <div className="flex flex-col">
                    <span className="font-medium">{model.name}</span>
                    {model.id !== model.name && (
                      <span className="text-xs text-muted-foreground">{model.id}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
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
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

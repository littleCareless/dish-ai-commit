import React, { useState } from 'react';
import { ProviderConfig } from '../../../types/settings';
import { ProviderBase } from './ProviderBase';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Info } from 'lucide-react';

interface OpenAICompatibleProviderProps {
  config: ProviderConfig;
  onChange: (config: ProviderConfig) => void;
  onTest?: () => Promise<boolean>;
  className?: string;
}

export const OpenAICompatibleProvider: React.FC<OpenAICompatibleProviderProps> = ({
  config,
  onChange,
  onTest,
  className = '',
}) => {
  const [customHeaders, setCustomHeaders] = useState(
    config.customHeaders ? JSON.stringify(config.customHeaders, null, 2) : ''
  );

  const handleCustomHeadersChange = (value: string) => {
    setCustomHeaders(value);
    try {
      const parsed = JSON.parse(value);
      onChange({
        ...config,
        customHeaders: parsed,
      });
    } catch (error) {
      // Invalid JSON, keep the raw value for editing
    }
  };

  return (
    <div className={className}>
      <ProviderBase
        config={config}
        onChange={onChange}
        onTest={onTest}
      />
      
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="w-4 h-4" />
            OpenAI Compatible Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor={`${config.id}-custom-headers`}>
              Custom Headers (JSON)
            </Label>
            <Input
              id={`${config.id}-custom-headers`}
              type="text"
              value={customHeaders}
              onChange={(e) => handleCustomHeadersChange((e.target as HTMLInputElement)?.value || '')}
              placeholder='{"Authorization": "Bearer token", "X-API-Key": "key"}'
            />
            <p className="text-sm text-muted-foreground">
              Additional headers to send with requests (optional).
            </p>
          </div>
          <div className="text-sm text-muted-foreground">
            This provider works with any OpenAI-compatible API endpoint.
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

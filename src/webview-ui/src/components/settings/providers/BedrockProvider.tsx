import React, { useState } from 'react';
import { ProviderConfig } from '../../../types/settings';
import { ProviderBase } from './ProviderBase';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Info } from 'lucide-react';

interface BedrockProviderProps {
  config: ProviderConfig;
  onChange: (config: ProviderConfig) => void;
  onTest?: () => Promise<boolean>;
  className?: string;
}

export const BedrockProvider: React.FC<BedrockProviderProps> = ({
  config,
  onChange,
  onTest,
  className = '',
}) => {
  const [region, setRegion] = useState(config.region || 'us-east-1');

  const handleRegionChange = (value: string) => {
    setRegion(value);
    onChange({
      ...config,
      region: value,
    });
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
            AWS Bedrock Specific Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor={`${config.id}-region`}>
              AWS Region
            </Label>
            <Input
              id={`${config.id}-region`}
              type="text"
              value={region}
              onChange={(e) => handleRegionChange((e.target as HTMLInputElement)?.value || '')}
              placeholder="us-east-1"
            />
            <p className="text-sm text-muted-foreground">
              The AWS region where your Bedrock service is available.
            </p>
          </div>
          <div className="text-sm">
            <a
              href="https://docs.aws.amazon.com/bedrock"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 underline"
            >
              View AWS Bedrock Documentation
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

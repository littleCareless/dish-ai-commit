import React from 'react';
import { ProviderConfig } from '../../../types/settings';
import { ProviderBase } from './ProviderBase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Info } from 'lucide-react';

interface LMStudioProviderProps {
  config: ProviderConfig;
  onChange: (config: ProviderConfig) => void;
  onTest?: () => Promise<boolean>;
  className?: string;
}

export const LMStudioProvider: React.FC<LMStudioProviderProps> = ({
  config,
  onChange,
  onTest,
  className = '',
}) => {
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
            LM Studio Specific Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground">
            LM Studio provides a local AI model server interface.
          </div>
          <div className="text-sm">
            <a
              href="https://lmstudio.ai/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 underline"
            >
              View LM Studio Documentation
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

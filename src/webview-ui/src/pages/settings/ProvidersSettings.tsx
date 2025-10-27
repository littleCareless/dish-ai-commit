import React, { useState } from 'react';
import { Profile, ProviderConfig } from '../../types/settings';
import { ProviderFactory, getProviderMetadata } from '../../components/settings/providers';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Settings } from 'lucide-react';

interface ProvidersSettingsProps {
  profile: Profile | null;
  onChange: (profile: Profile) => void;
}

export const ProvidersSettings: React.FC<ProvidersSettingsProps> = ({
  profile,
  onChange,
}) => {
  const [selectedProvider, setSelectedProvider] = useState<string>('');

  const availableProviders = [
    { id: 'anthropic', name: 'Anthropic', type: 'first-party' },
    { id: 'openai', name: 'OpenAI', type: 'first-party' },
    { id: 'gemini', name: 'Google Gemini', type: 'first-party' },
    { id: 'openrouter', name: 'OpenRouter', type: 'aggregator' },
    { id: 'ollama', name: 'Ollama', type: 'local' },
    { id: 'lmstudio', name: 'LM Studio', type: 'local' },
    { id: 'bedrock', name: 'AWS Bedrock', type: 'cloud' },
    { id: 'vertex', name: 'Google Vertex AI', type: 'cloud' },
    { id: 'openai-compatible', name: 'OpenAI Compatible', type: 'openai-compatible' },
  ];

  const createDefaultProviderConfig = (providerId: string): ProviderConfig => {
    const metadata = getProviderMetadata(providerId);
    const now = new Date();
    
    return {
      id: providerId,
      name: metadata.name,
      type: metadata.type as any,
      models: [],
      isActive: false,
      createdAt: now,
      updatedAt: now,
    };
  };

  const handleProviderConfigChange = (providerId: string, config: ProviderConfig) => {
    if (!profile) return;

    const updatedProfile = {
      ...profile,
      providers: {
        ...profile.providers,
        [providerId]: config,
      },
    };

    onChange(updatedProfile);
  };

  const handleAddProvider = () => {
    if (!selectedProvider) return;

    const config = createDefaultProviderConfig(selectedProvider);
    handleProviderConfigChange(selectedProvider, config);
    setSelectedProvider('');
  };

  const handleRemoveProvider = (providerId: string) => {
    if (!profile) return;

    const { [providerId]: removed, ...remainingProviders } = profile.providers;
    
    const updatedProfile = {
      ...profile,
      providers: remainingProviders,
    };

    onChange(updatedProfile);
  };

  const handleTestConnection = async (providerId: string) => {
    // This would typically call the backend to test the connection
    // For now, we'll just simulate the test
    try {
      // TODO: Implement actual connection testing
      console.log(`Testing connection for ${providerId}`);
      return true;
    } catch (error) {
      console.error(`Connection test failed for ${providerId}:`, error);
      return false;
    }
  };

  const getProviderTypeColor = (type: string) => {
    switch (type) {
      case 'first-party':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'aggregator':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'local':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'cloud':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'openai-compatible':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-4">Configure Providers</h2>
        <p className="text-muted-foreground mb-4">
          Add and configure AI providers for your profile. Each provider can be configured with different models and settings.
        </p>
      </div>

      {/* Add New Provider */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Add Provider
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Select value={selectedProvider} onValueChange={setSelectedProvider}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select a provider to add...">
                  {selectedProvider ? availableProviders.find(p => p.id === selectedProvider)?.name : 'Select a provider to add...'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {availableProviders.map((provider) => (
                  <SelectItem key={provider.id} value={provider.id}>
                    <div className="flex items-center justify-between w-full">
                      <span>{provider.name}</span>
                      <Badge className={getProviderTypeColor(provider.type)} variant="secondary">
                        {provider.type.replace('-', ' ')}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button 
              onClick={handleAddProvider}
              disabled={!selectedProvider || (profile && profile.providers[selectedProvider] !== undefined) || false}
            >
              Add Provider
            </Button>
          </div>
          {selectedProvider && profile && profile.providers[selectedProvider] && (
            <p className="text-sm text-muted-foreground">
              This provider is already configured in this profile.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Configure Selected Provider */}
      {selectedProvider && profile && profile.providers[selectedProvider] && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Configure {availableProviders.find(p => p.id === selectedProvider)?.name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ProviderFactory
              providerId={selectedProvider}
              config={profile.providers[selectedProvider]}
              onChange={(config) => handleProviderConfigChange(selectedProvider, config)}
              onTest={() => handleTestConnection(selectedProvider)}
            />
          </CardContent>
        </Card>
      )}

      {/* Configured Providers List */}
      <div>
        <h3 className="text-lg font-medium mb-4">Configured Providers</h3>
        {profile && Object.keys(profile.providers).length > 0 ? (
          <div className="space-y-3">
            {Object.entries(profile.providers).map(([id, config]) => (
              <Card key={id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{config.name}</span>
                          <Badge className={getProviderTypeColor(config.type)} variant="secondary">
                            {config.type.replace('-', ' ')}
                          </Badge>
                          {config.isActive && (
                            <Badge variant="default">Active</Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {config.models.length} models available
                          {config.defaultModel && ` • Default: ${config.defaultModel}`}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedProvider(id)}
                      >
                        <Settings className="w-4 h-4 mr-2" />
                        Configure
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRemoveProvider(id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="text-muted-foreground">
                <Settings className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No providers configured yet.</p>
                <p className="text-sm">Add a provider above to get started.</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

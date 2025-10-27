import React, { useMemo } from 'react';
import { ProviderConfig } from '../../../types/settings';
import { ProviderBase } from './ProviderBase';
import { AnthropicProvider } from './AnthropicProvider';
import { OpenAIProvider } from './OpenAIProvider';
import { OllamaProvider } from './OllamaProvider';
import { OpenRouterProvider } from './OpenRouterProvider';
import { GeminiProvider } from './GeminiProvider';
import { LMStudioProvider } from './LMStudioProvider';
import { BedrockProvider } from './BedrockProvider';
import { VertexProvider } from './VertexProvider';
import { OpenAICompatibleProvider } from './OpenAICompatibleProvider';

interface ProviderFactoryProps {
  providerId: string;
  config: ProviderConfig;
  onChange: (config: ProviderConfig) => void;
  onTest?: () => Promise<boolean>;
  className?: string;
}

export const ProviderFactory: React.FC<ProviderFactoryProps> = ({
  providerId,
  config,
  onChange,
  onTest,
  className = '',
}) => {
  const ProviderComponent = useMemo(() => {
    switch (providerId) {
      case 'anthropic':
        return AnthropicProvider;
      case 'openai':
        return OpenAIProvider;
      case 'ollama':
        return OllamaProvider;
      case 'openrouter':
        return OpenRouterProvider;
      case 'gemini':
        return GeminiProvider;
      case 'lmstudio':
        return LMStudioProvider;
      case 'bedrock':
        return BedrockProvider;
      case 'vertex':
        return VertexProvider;
      case 'openai-compatible':
        return OpenAICompatibleProvider;
      default:
        return ProviderBase;
    }
  }, [providerId]);

  return (
    <ProviderComponent
      config={config}
      onChange={onChange}
      onTest={onTest}
      className={className}
    />
  );
};

// Provider registry for dynamic registration
export const ProviderRegistry = {
  'anthropic': AnthropicProvider,
  'openai': OpenAIProvider,
  'ollama': OllamaProvider,
  'openrouter': OpenRouterProvider,
  'gemini': GeminiProvider,
  'lmstudio': LMStudioProvider,
  'bedrock': BedrockProvider,
  'vertex': VertexProvider,
  'openai-compatible': OpenAICompatibleProvider,
};

// Utility function to get provider component
export const getProviderComponent = (providerId: string) => {
  return ProviderRegistry[providerId as keyof typeof ProviderRegistry] || ProviderBase;
};

// Utility function to get provider metadata
export const getProviderMetadata = (providerId: string) => {
  const metadata = {
    'anthropic': {
      name: 'Anthropic',
      type: 'first-party',
      description: 'Claude AI models by Anthropic',
      icon: '🤖',
      website: 'https://www.anthropic.com',
    },
    'openai': {
      name: 'OpenAI',
      type: 'first-party',
      description: 'GPT models by OpenAI',
      icon: '🧠',
      website: 'https://openai.com',
    },
    'ollama': {
      name: 'Ollama',
      type: 'local',
      description: 'Local AI models with Ollama',
      icon: '🏠',
      website: 'https://ollama.ai',
    },
    'openrouter': {
      name: 'OpenRouter',
      type: 'aggregator',
      description: 'Access multiple AI models through OpenRouter',
      icon: '🔗',
      website: 'https://openrouter.ai',
    },
    'gemini': {
      name: 'Google Gemini',
      type: 'first-party',
      description: 'Gemini models by Google',
      icon: '💎',
      website: 'https://ai.google.dev',
    },
    'lmstudio': {
      name: 'LM Studio',
      type: 'local',
      description: 'Local AI models with LM Studio',
      icon: '🎨',
      website: 'https://lmstudio.ai',
    },
    'bedrock': {
      name: 'AWS Bedrock',
      type: 'cloud',
      description: 'AI models on AWS Bedrock',
      icon: '☁️',
      website: 'https://aws.amazon.com/bedrock',
    },
    'vertex': {
      name: 'Google Vertex AI',
      type: 'cloud',
      description: 'AI models on Google Cloud Vertex AI',
      icon: '🌐',
      website: 'https://cloud.google.com/vertex-ai',
    },
    'openai-compatible': {
      name: 'OpenAI Compatible',
      type: 'openai-compatible',
      description: 'Any OpenAI-compatible API endpoint',
      icon: '🔌',
      website: '',
    },
  };

  return metadata[providerId as keyof typeof metadata] || {
    name: providerId,
    type: 'openai-compatible',
    description: 'Custom provider',
    icon: '⚙️',
    website: '',
  };
};

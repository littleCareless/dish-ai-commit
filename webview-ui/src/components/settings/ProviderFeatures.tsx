/**
 * 提供商特性展示组件
 * 显示提供商支持的功能特性
 */

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CheckCircle,
  Code,
  Cpu,
  Database,
  Eye,
  Layers,
  XCircle,
  Zap,
} from "lucide-react";
import React from "react";
import { ProviderFeatures as ProviderFeaturesType } from "@/types/provider-metadata";

interface ProviderFeaturesProps {
  features: ProviderFeaturesType;
  className?: string;
}

export const ProviderFeatures: React.FC<ProviderFeaturesProps> = ({
  features,
  className = "",
}) => {
  const featureItems = [
    {
      key: "streaming" as keyof ProviderFeaturesType,
      label: "流式输出",
      description: "支持实时流式响应",
      icon: Zap,
      color: "bg-blue-100 text-blue-800",
    },
    {
      key: "vision" as keyof ProviderFeaturesType,
      label: "图像理解",
      description: "支持图像输入和分析",
      icon: Eye,
      color: "bg-purple-100 text-purple-800",
    },
    {
      key: "functionCalling" as keyof ProviderFeaturesType,
      label: "函数调用",
      description: "支持工具和函数调用",
      icon: Code,
      color: "bg-green-100 text-green-800",
    },
    {
      key: "promptCache" as keyof ProviderFeaturesType,
      label: "提示缓存",
      description: "支持提示缓存优化",
      icon: Database,
      color: "bg-orange-100 text-orange-800",
    },
    {
      key: "embeddings" as keyof ProviderFeaturesType,
      label: "嵌入向量",
      description: "支持文本嵌入生成",
      icon: Layers,
      color: "bg-indigo-100 text-indigo-800",
    },
    {
      key: "tools" as keyof ProviderFeaturesType,
      label: "工具集成",
      description: "支持外部工具集成",
      icon: Cpu,
      color: "bg-cyan-100 text-cyan-800",
    },
    {
      key: "jsonMode" as keyof ProviderFeaturesType,
      label: "JSON 模式",
      description: "支持结构化 JSON 输出",
      icon: Code,
      color: "bg-yellow-100 text-yellow-800",
    },
  ];

  const supportedFeatures = featureItems.filter((item) => features[item.key]);
  const unsupportedFeatures = featureItems.filter(
    (item) => !features[item.key],
  );

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <span>支持特性</span>
          <Badge variant="secondary" className="ml-2">
            {supportedFeatures.length}/{featureItems.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* 支持的特性 */}
          {supportedFeatures.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-green-700 mb-2 flex items-center">
                <CheckCircle className="h-4 w-4 mr-1" />
                已支持
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {supportedFeatures.map((feature) => {
                  const IconComponent = feature.icon;
                  return (
                    <div
                      key={feature.key}
                      className={`flex items-center space-x-2 p-2 rounded-md ${feature.color}`}
                    >
                      <IconComponent className="h-4 w-4" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium">
                          {feature.label}
                        </div>
                        <div className="text-xs opacity-75">
                          {feature.description}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 不支持的特性 */}
          {unsupportedFeatures.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-2 flex items-center">
                <XCircle className="h-4 w-4 mr-1" />
                不支持
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {unsupportedFeatures.map((feature) => {
                  const IconComponent = feature.icon;
                  return (
                    <div
                      key={feature.key}
                      className="flex items-center space-x-2 p-2 rounded-md bg-gray-100 text-gray-500"
                    >
                      <IconComponent className="h-4 w-4" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium">
                          {feature.label}
                        </div>
                        <div className="text-xs opacity-75">
                          {feature.description}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 特殊特性 */}
          {features.parallelRequests && (
            <div className="mt-4 p-3 bg-blue-50 rounded-md">
              <div className="flex items-center space-x-2">
                <Cpu className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">
                  并行请求
                </span>
              </div>
              <p className="text-xs text-blue-600 mt-1">
                支持同时处理多个请求，提高响应速度
              </p>
            </div>
          )}

          {features.customModels && (
            <div className="mt-4 p-3 bg-green-50 rounded-md">
              <div className="flex items-center space-x-2">
                <Layers className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-800">
                  自定义模型
                </span>
              </div>
              <p className="text-xs text-green-600 mt-1">
                支持加载和使用自定义训练的模型
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

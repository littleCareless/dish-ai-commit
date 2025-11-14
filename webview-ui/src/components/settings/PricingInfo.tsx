/**
 * 定价信息展示组件
 * 显示提供商的定价信息
 */

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, Database, DollarSign, TrendingUp } from "lucide-react";
import React from "react";
import {
  ModelMetadata,
  PricingInfo as PricingInfoType,
} from "../../types/provider-metadata";

interface PricingInfoProps {
  pricing?: PricingInfoType;
  models?: ModelMetadata[];
  className?: string;
}

export const PricingInfo: React.FC<PricingInfoProps> = ({
  pricing,
  models = [],
  className = "",
}) => {
  if (!pricing) {
    return null;
  }

  const formatPricePerMillion = (price: number) => {
    return `$${price.toFixed(2)}/1M tokens`;
  };

  const calculateModelCost = (model: ModelMetadata) => {
    if (!model.pricing) return null;

    const inputCost = model.pricing.input;
    const outputCost = model.pricing.output;

    return {
      input: inputCost,
      output: outputCost,
      cacheWrite: model.pricing.cacheWrite,
      cacheRead: model.pricing.cacheRead,
    };
  };

  const hasDetailedPricing = models.some((model) => model.pricing);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <DollarSign className="h-5 w-5" />
          <span>定价信息</span>
          {pricing.lastUpdated && (
            <Badge variant="outline" className="ml-2">
              更新于 {new Date(pricing.lastUpdated).toLocaleDateString()}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* 基础定价 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">输入 Token</span>
                <span className="text-sm text-muted-foreground">
                  {formatPricePerMillion(pricing.input)}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full"
                  style={{ width: "60%" }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">输出 Token</span>
                <span className="text-sm text-muted-foreground">
                  {formatPricePerMillion(pricing.output)}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-600 h-2 rounded-full"
                  style={{ width: "80%" }}
                />
              </div>
            </div>
          </div>

          {/* 缓存定价 */}
          {(pricing.cacheWrite || pricing.cacheRead) && (
            <div className="pt-4 border-t">
              <h4 className="text-sm font-medium mb-3 flex items-center">
                <Database className="h-4 w-4 mr-1" />
                缓存定价
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {pricing.cacheWrite && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">缓存写入</span>
                      <span className="text-sm text-muted-foreground">
                        {formatPricePerMillion(pricing.cacheWrite)}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-orange-600 h-2 rounded-full"
                        style={{ width: "40%" }}
                      />
                    </div>
                  </div>
                )}

                {pricing.cacheRead && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">缓存读取</span>
                      <span className="text-sm text-muted-foreground">
                        {formatPricePerMillion(pricing.cacheRead)}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-purple-600 h-2 rounded-full"
                        style={{ width: "20%" }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 模型详细定价 */}
          {hasDetailedPricing && (
            <div className="pt-4 border-t">
              <h4 className="text-sm font-medium mb-3 flex items-center">
                <TrendingUp className="h-4 w-4 mr-1" />
                模型定价
              </h4>
              <div className="space-y-3">
                {models
                  .filter((model) => model.pricing)
                  .map((model) => {
                    const cost = calculateModelCost(model);
                    if (!cost) return null;

                    return (
                      <div key={model.id} className="p-3 bg-gray-50 rounded-md">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">{model.name}</span>
                          <Badge variant="outline">
                            {model.contextWindow.toLocaleString()} tokens
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="flex justify-between">
                            <span>输入:</span>
                            <span>{formatPricePerMillion(cost.input)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>输出:</span>
                            <span>{formatPricePerMillion(cost.output)}</span>
                          </div>
                          {cost.cacheWrite && (
                            <div className="flex justify-between">
                              <span>缓存写入:</span>
                              <span>
                                {formatPricePerMillion(cost.cacheWrite)}
                              </span>
                            </div>
                          )}
                          {cost.cacheRead && (
                            <div className="flex justify-between">
                              <span>缓存读取:</span>
                              <span>
                                {formatPricePerMillion(cost.cacheRead)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* 成本估算提示 */}
          <div className="pt-4 border-t">
            <div className="p-3 bg-blue-50 rounded-md">
              <div className="flex items-start space-x-2">
                <Clock className="h-4 w-4 text-blue-600 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-blue-800">成本估算</p>
                  <p className="text-blue-600 mt-1">
                    实际费用取决于使用量。建议先进行小规模测试以评估成本。
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 货币信息 */}
          <div className="text-xs text-muted-foreground text-center">
            价格以 {pricing.currency} 计算，可能因地区而异
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

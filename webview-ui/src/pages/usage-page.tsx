import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { postMessage } from "@/utils/vscode";
import { RotateCcw } from "lucide-react";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useEvent } from "react-use";

interface DailyUsageStats {
  date: string;
  totalTokens: number;
  byModel: Record<string, number>;
  byFeature: Record<string, number>;
}

export const UsagePage: React.FC = () => {
  const { t } = useTranslation("usage-page");
  const [totalTokens, setTotalTokens] = useState<number>(0);
  const [detailedStats, setDetailedStats] = useState<DailyUsageStats[]>([]);

  const fetchUsageStats = () => {
    postMessage("getUsageStats", {});
  };

  useEffect(() => {
    fetchUsageStats();
  }, []);

  useEvent("message", (event: MessageEvent) => {
    const message = event.data;
    if (message.command === "usageStats") {
      console.log("[UsagePage] 接收到使用统计数据:", message.data);
      setTotalTokens(message.data.totalTokens);
      setDetailedStats(message.data.detailedStats || []);
    }
  });

  const handleReset = () => {
    postMessage("resetUsageStats", {});
  };

  // Prepare data for lists
  const dailyData = detailedStats
    .slice(-7)
    .map((stat) => ({
      date: stat.date,
      tokens: stat.totalTokens,
    }))
    .reverse(); // Show newest first

  const modelData = detailedStats.reduce(
    (acc, stat) => {
      Object.entries(stat.byModel).forEach(([model, tokens]) => {
        acc[model] = (acc[model] || 0) + tokens;
      });
      return acc;
    },
    {} as Record<string, number>,
  );

  const featureData = detailedStats.reduce(
    (acc, stat) => {
      Object.entries(stat.byFeature).forEach(([feature, tokens]) => {
        acc[feature] = (acc[feature] || 0) + tokens;
      });
      return acc;
    },
    {} as Record<string, number>,
  );

  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground mt-2">{t("description")}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RotateCcw className="mr-2 h-4 w-4" />
            {t("reset")}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("totalTokens")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalTokens.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {t("totalTokensDescription")}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("dailyUsage")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {dailyData.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t("noUsageData")}
                </p>
              ) : (
                dailyData.map((stat) => (
                  <div
                    key={stat.date}
                    className="flex justify-between items-center text-sm border-b pb-2 last:border-0 last:pb-0"
                  >
                    <span>{stat.date}</span>
                    <span className="font-medium">
                      {stat.tokens.toLocaleString()} {t("tokens")}
                    </span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("byModel")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.keys(modelData).length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t("noModelData")}
                </p>
              ) : (
                Object.entries(modelData)
                  .sort(([, a], [, b]) => b - a)
                  .map(([model, tokens]) => (
                    <div
                      key={model}
                      className="flex justify-between items-center text-sm border-b pb-2 last:border-0 last:pb-0"
                    >
                      <span className="truncate max-w-[150px]" title={model}>
                        {model}
                      </span>
                      <span className="font-medium">
                        {tokens.toLocaleString()}
                      </span>
                    </div>
                  ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("byFeature")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.keys(featureData).length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t("noFeatureData")}
                </p>
              ) : (
                Object.entries(featureData)
                  .sort(([, a], [, b]) => b - a)
                  .map(([feature, tokens]) => (
                    <div
                      key={feature}
                      className="flex justify-between items-center text-sm border-b pb-2 last:border-0 last:pb-0"
                    >
                      <span>{feature}</span>
                      <span className="font-medium">
                        {tokens.toLocaleString()}
                      </span>
                    </div>
                  ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectOption } from "@/components/ui/select";
import {
  ModelRegistryRow,
  ModelRegistryTable,
} from "@/components/settings/ModelRegistryTable";
import { ExtensionResponse, UIRequest } from "@shared/types/messages";
import { Database } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { postMessage } from "@/utils/vscode";

export const ModelCatalogViewer: React.FC = () => {
  const { t } = useTranslation("features-settings");
  const [syncingCatalog, setSyncingCatalog] = useState(false);
  const [catalogSyncMessage, setCatalogSyncMessage] = useState("");
  const [modelCatalogEntries, setModelCatalogEntries] = useState<any[]>([]);
  const [catalogTotalEntries, setCatalogTotalEntries] = useState(0);
  const [catalogLastSyncAt, setCatalogLastSyncAt] = useState("");
  const [catalogQuery, setCatalogQuery] = useState("");
  const [catalogSourceFilter, setCatalogSourceFilter] = useState("all");

  useEffect(() => {
    postMessage(
      UIRequest.FeaturesGetModelCatalog,
      {},
      { allowDuplicate: true },
    );

    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      if (message.command === ExtensionResponse.FeaturesModelCatalogSynced) {
        setSyncingCatalog(false);
        postMessage(
          UIRequest.FeaturesGetModelCatalog,
          {},
          { allowDuplicate: true },
        );
        if (message.data?.success) {
          setCatalogSyncMessage(t("contextGuard.sync.result.success"));
        } else {
          setCatalogSyncMessage(
            t("contextGuard.sync.result.failed", {
              error: message.data?.error || "unknown",
            }),
          );
        }
      }

      if (message.command === ExtensionResponse.FeaturesModelCatalogLoaded) {
        setCatalogTotalEntries(Number(message.data?.totalEntries || 0));
        setCatalogLastSyncAt(String(message.data?.lastSyncAt || ""));
        setModelCatalogEntries(
          Array.isArray(message.data?.entries) ? message.data.entries : [],
        );
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [t]);

  const handleSyncModelCatalog = () => {
    setSyncingCatalog(true);
    setCatalogSyncMessage(t("contextGuard.sync.result.syncing"));
    postMessage(
      UIRequest.FeaturesSyncModelCatalog,
      {},
      { allowDuplicate: true },
    );
  };

  const filteredCatalogEntries = useMemo(() => {
    const q = catalogQuery.trim().toLowerCase();
    return [...modelCatalogEntries]
      .filter((entry) => {
        if (
          catalogSourceFilter !== "all" &&
          String(entry.source || "") !== catalogSourceFilter
        ) {
          return false;
        }
        if (!q) {
          return true;
        }
        const provider = String(entry.providerId || "").toLowerCase();
        const model = String(entry.modelId || "").toLowerCase();
        const src = String(entry.source || "").toLowerCase();
        return provider.includes(q) || model.includes(q) || src.includes(q);
      })
      .sort((a, b) => {
        const providerCompare = String(a.providerId || "").localeCompare(
          String(b.providerId || ""),
        );
        if (providerCompare !== 0) {
          return providerCompare;
        }
        return String(a.modelId || "").localeCompare(String(b.modelId || ""));
      });
  }, [catalogQuery, catalogSourceFilter, modelCatalogEntries]);

  const tableRows: ModelRegistryRow[] = filteredCatalogEntries.map((entry) => ({
    providerId: String(entry.providerId || ""),
    modelId: String(entry.modelId || ""),
    modelName: String(entry.modelName || entry.modelId || ""),
    inputTokens: Number(entry.inputLimit || 0),
    outputTokens:
      Number.isFinite(Number(entry.outputLimit)) &&
      Number(entry.outputLimit) > 0
        ? Number(entry.outputLimit)
        : undefined,
    contextWindow:
      Number.isFinite(Number(entry.inputLimit)) && Number(entry.inputLimit) > 0
        ? Number(entry.inputLimit)
        : undefined,
    capabilities: [],
    source: String(entry.source || "-"),
    updatedAt: String(entry.updatedAt || ""),
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="w-5 h-5" />
          {t("modelCatalogViewer.title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          {t("modelCatalogViewer.description")}
        </p>
        <div className="flex items-center justify-between py-2 gap-4">
          <div className="flex flex-col">
            <Label htmlFor="sync-model-catalog">
              {t("contextGuard.sync.label")}
            </Label>
            <p className="text-sm text-muted-foreground">
              {t("contextGuard.sync.description")}
            </p>
            {catalogSyncMessage && (
              <p className="text-xs text-muted-foreground mt-1">
                {catalogSyncMessage}
              </p>
            )}
          </div>
          <Button
            id="sync-model-catalog"
            onClick={handleSyncModelCatalog}
            disabled={syncingCatalog}
            appearance="secondary"
          >
            {syncingCatalog
              ? t("contextGuard.sync.buttonSyncing")
              : t("contextGuard.sync.button")}
          </Button>
        </div>
        <div className="flex items-center justify-between gap-4">
          <div className="text-sm text-muted-foreground">
            {t("contextGuard.catalog.total", { count: catalogTotalEntries })}
          </div>
          <div className="text-xs text-muted-foreground">
            {catalogLastSyncAt
              ? t("contextGuard.catalog.lastSyncAt", {
                  time: new Date(catalogLastSyncAt).toLocaleString(),
                })
              : t("contextGuard.catalog.neverSynced")}
          </div>
        </div>
        <Input
          placeholder={t("contextGuard.catalog.searchPlaceholder")}
          value={catalogQuery}
          onChange={(event) => setCatalogQuery(event.target.value)}
        />
        <div className="flex items-center justify-between gap-2">
          <Select
            value={catalogSourceFilter}
            onValueChange={(value) => setCatalogSourceFilter(value)}
            className="w-56"
          >
            <SelectOption value="all">
              {t("contextGuard.catalog.sourceFilter.all")}
            </SelectOption>
            <SelectOption value="openrouter">
              {t("contextGuard.catalog.sourceFilter.openrouter")}
            </SelectOption>
            <SelectOption value="litellm">
              {t("contextGuard.catalog.sourceFilter.litellm")}
            </SelectOption>
            <SelectOption value="custom">
              {t("contextGuard.catalog.sourceFilter.custom")}
            </SelectOption>
          </Select>
          <p className="text-xs text-muted-foreground">
            {t("contextGuard.catalog.showing", {
              count: filteredCatalogEntries.length,
            })}
          </p>
        </div>
        <ModelRegistryTable
          rows={tableRows}
          isLoading={false}
          loadingText={t("model-custom:status.loading")}
          emptyTitle={t("contextGuard.catalog.empty")}
          emptyDescription={t("contextGuard.catalog.note")}
        />
        <p className="text-xs text-muted-foreground">
          {t("contextGuard.catalog.note")}
        </p>
      </CardContent>
    </Card>
  );
};

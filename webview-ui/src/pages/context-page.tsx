import { PageHeader, PageLayout } from "@/components/layout/PageLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useVSCodeMessage } from "@/hooks/use-vscode-message";
import { postMessage } from "@/utils/vscode";
import {
  ContextPreviewSnapshot,
  ExtensionResponse,
  UIRequest,
} from "@shared/types/messages";
import { RefreshCw, WandSparkles } from "lucide-react";
import React from "react";
import { useTranslation } from "react-i18next";

export const ContextPage: React.FC = () => {
  const { t } = useTranslation("context-page");
  const [snapshot, setSnapshot] = React.useState<ContextPreviewSnapshot | null>(
    null,
  );
  const [preview, setPreview] = React.useState<ContextPreviewSnapshot | null>(
    null,
  );
  const [excludedBlocks, setExcludedBlocks] = React.useState<string[]>([]);
  const [selectedBlockName, setSelectedBlockName] = React.useState<string>("");

  const activeSnapshot = preview || snapshot;

  const fetchLatest = React.useCallback(() => {
    postMessage(UIRequest.ContextGetLatest);
  }, []);

  const rebuildPreview = React.useCallback(() => {
    postMessage(UIRequest.ContextRebuildPreview, { exclude: excludedBlocks });
  }, [excludedBlocks]);

  React.useEffect(() => {
    fetchLatest();
  }, [fetchLatest]);

  useVSCodeMessage<{ data: ContextPreviewSnapshot | null }>(
    ExtensionResponse.ContextLatestLoaded,
    (payload) => {
      setSnapshot(payload.data);
      setPreview(null);
      setExcludedBlocks([]);
      const firstName = payload.data?.blocks?.[0]?.name || "";
      setSelectedBlockName(firstName);
    },
  );

  useVSCodeMessage<{ data: ContextPreviewSnapshot | null }>(
    ExtensionResponse.ContextPreviewUpdated,
    (payload) => {
      setPreview(payload.data);
      if (!selectedBlockName && payload.data?.blocks?.[0]?.name) {
        setSelectedBlockName(payload.data.blocks[0].name);
      }
    },
  );

  const selectedBlock = React.useMemo(
    () =>
      activeSnapshot?.blocks.find((block) => block.name === selectedBlockName),
    [activeSnapshot, selectedBlockName],
  );

  const toggleExcluded = (blockName: string, checked: boolean) => {
    setExcludedBlocks((prev) => {
      if (checked) {
        return Array.from(new Set([...prev, blockName]));
      }
      return prev.filter((name) => name !== blockName);
    });
  };

  const renderSummary = () => {
    if (!activeSnapshot) {
      return (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            {t("empty")}
          </CardContent>
        </Card>
      );
    }

    const { summary } = activeSnapshot;
    return (
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{t("model")}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <div className="font-semibold">{summary.modelId}</div>
            <div className="text-xs text-muted-foreground">
              {summary.provider}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              {t("tokens.rawFinal")}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <div>
              {summary.rawPromptTokens.toLocaleString()} /{" "}
              {summary.finalPromptTokens.toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground">
              max {summary.maxInputTokens.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              {t("tokens.systemReserve")}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <div>
              {summary.systemPromptTokens.toLocaleString()} /{" "}
              {summary.reserveTokens.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              {t("generatedAt")}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {new Date(summary.generatedAt).toLocaleString()}
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <PageLayout maxWidth="5xl">
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={fetchLatest}>
              <RefreshCw className="mr-2 h-4 w-4" />
              {t("actions.refresh")}
            </Button>
            <Button size="sm" onClick={rebuildPreview} disabled={!snapshot}>
              <WandSparkles className="mr-2 h-4 w-4" />
              {t("actions.rebuild")}
            </Button>
          </>
        }
      />

      {renderSummary()}

      {activeSnapshot && (
        <div className="grid gap-4 md:grid-cols-[1.2fr_1.8fr]">
          <Card>
            <CardHeader>
              <CardTitle>{t("blocks.title")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {activeSnapshot.blocks.map((block) => {
                const isExcluded = excludedBlocks.includes(block.name);
                return (
                  <div
                    key={block.name}
                    className="rounded border p-2 cursor-pointer hover:bg-accent/30"
                    onClick={() => setSelectedBlockName(block.name)}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-medium text-sm">{block.name}</div>
                      <div className="flex items-center gap-1">
                        {block.included ? (
                          <Badge variant="default">
                            {t("blocks.included")}
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            {t("blocks.excluded")}
                          </Badge>
                        )}
                        {block.truncated && (
                          <Badge variant="outline">
                            {t("blocks.truncated")}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                      <span>
                        P{block.priority} · {block.rawTokens}/
                        {block.finalTokens}
                      </span>
                      <div className="flex items-center gap-2">
                        <label htmlFor={`exclude-${block.name}`}>
                          {t("blocks.exclude")}
                        </label>
                        <Checkbox
                          id={`exclude-${block.name}`}
                          checked={isExcluded}
                          onCheckedChange={(checked) =>
                            toggleExcluded(block.name, checked)
                          }
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("detail.title")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {selectedBlock ? (
                <>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{selectedBlock.strategy}</Badge>
                    {selectedBlock.forceRetained && (
                      <Badge variant="secondary">
                        {t("blocks.forceRetained")}
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {t("detail.tokenStats", {
                      raw: selectedBlock.rawTokens,
                      final: selectedBlock.finalTokens,
                    })}
                  </div>
                  <Separator />
                  <pre className="text-xs whitespace-pre-wrap rounded bg-muted p-3 max-h-[320px] overflow-auto">
                    {selectedBlock.contentPreview || t("detail.emptyContent")}
                  </pre>
                </>
              ) : (
                <div className="text-sm text-muted-foreground">
                  {t("detail.empty")}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {activeSnapshot?.finalUserContent && (
        <Card>
          <CardHeader>
            <CardTitle>{t("finalPrompt.title")}</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs whitespace-pre-wrap rounded bg-muted p-3 max-h-[360px] overflow-auto">
              {activeSnapshot.finalUserContent}
            </pre>
          </CardContent>
        </Card>
      )}
    </PageLayout>
  );
};

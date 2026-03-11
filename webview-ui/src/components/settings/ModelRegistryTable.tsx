import { Badge } from "@/components/ui/badge";
import { themeStyles } from "@/utils/theme";
import { CSSProperties } from "react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

export interface ModelRegistryRow {
  providerId: string;
  modelId: string;
  modelName: string;
  inputTokens: number;
  outputTokens?: number;
  contextWindow?: number;
  capabilities?: string[];
  deprecated?: boolean;
  source?: string;
  updatedAt?: string;
}

interface ModelRegistryTableProps {
  rows: ModelRegistryRow[];
  isLoading: boolean;
  loadingText: string;
  emptyTitle: string;
  emptyDescription: string;
  showActions?: boolean;
  renderActions?: (row: ModelRegistryRow) => ReactNode;
}

export function ModelRegistryTable({
  rows,
  isLoading,
  loadingText,
  emptyTitle,
  emptyDescription,
  showActions = false,
  renderActions,
}: ModelRegistryTableProps) {
  const { t } = useTranslation("model-custom");

  const stickyHeaderStyle: CSSProperties = {
    position: "sticky",
    top: 0,
    zIndex: 2,
    backgroundColor: themeStyles.muted(),
    boxShadow: "0 2px 4px rgba(0,0,0,0.08)",
  };

  if (isLoading) {
    return (
      <div
        className="text-center py-8"
        style={{ color: themeStyles.mutedForeground() }}
      >
        {loadingText}
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div
        className="text-center py-12 border rounded-lg"
        style={{
          backgroundColor: themeStyles.background(0.5),
          borderColor: themeStyles.border(),
        }}
      >
        <p className="text-lg font-medium mb-2">{emptyTitle}</p>
        <p className="text-sm" style={{ color: themeStyles.mutedForeground() }}>
          {emptyDescription}
        </p>
      </div>
    );
  }

  return (
    <div
      className="rounded-lg border overflow-hidden"
      style={{ borderColor: themeStyles.border() }}
    >
      <div
        className="w-full overflow-x-auto"
        style={{ scrollbarColor: `${themeStyles.border()} transparent` }}
      >
        <div className="max-h-[520px] overflow-y-auto">
          <table className="w-full min-w-[1280px] text-sm">
            <thead
              style={{
                backgroundColor: themeStyles.muted(),
              }}
            >
              <tr>
                {[
                  "table.provider",
                  "table.modelId",
                  "table.name",
                  "table.input",
                  "table.output",
                  "table.contextWindow",
                  "table.capabilities",
                  "table.source",
                  "table.updatedAt",
                ].map((key) => (
                  <th
                    key={key}
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide"
                    style={stickyHeaderStyle}
                  >
                    {t(key)}
                  </th>
                ))}
                {showActions && (
                  <th
                    className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide"
                    style={stickyHeaderStyle}
                  >
                    {t("table.actions")}
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const capabilities = row.capabilities ?? [];
                return (
                  <tr
                    key={`${row.providerId}_${row.modelId}_${row.source || "default"}`}
                    className="border-t transition-colors hover:bg-[var(--vscode-list-hoverBackground)]"
                    style={{ borderColor: themeStyles.border() }}
                  >
                    <td className="px-4 py-3">
                      <Badge variant="secondary">{row.providerId}</Badge>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {row.modelId}
                    </td>
                    <td className="px-4 py-3 font-medium">
                      <div className="flex items-center gap-2">
                        <span>{row.modelName}</span>
                        {row.deprecated ? (
                          <Badge variant="destructive">{t("deprecated")}</Badge>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      {row.inputTokens?.toLocaleString?.() ?? "-"}
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      {row.outputTokens?.toLocaleString?.() ?? "-"}
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      {row.contextWindow?.toLocaleString?.() ?? "-"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {capabilities.length > 0 ? (
                          capabilities.map((cap) => (
                            <Badge key={cap} variant="outline">
                              {cap}
                            </Badge>
                          ))
                        ) : (
                          <span
                            className="text-xs"
                            style={{ color: themeStyles.mutedForeground() }}
                          >
                            {t("table.none")}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">{row.source ?? "-"}</td>
                    <td className="px-4 py-3">
                      {row.updatedAt
                        ? new Date(row.updatedAt).toLocaleString()
                        : "-"}
                    </td>
                    {showActions && (
                      <td className="px-4 py-3 text-right space-x-2">
                        {renderActions ? renderActions(row) : null}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

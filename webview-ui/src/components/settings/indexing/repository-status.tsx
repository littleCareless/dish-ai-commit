import React from "react";
import { useTranslation } from "react-i18next";

interface RepositoryInfo {
  path: string;
  name: string;
  type: "git" | "svn" | "unknown";
}

interface RepositoryStatusItem {
  repository: RepositoryInfo;
  isIndexed: number;
  lastIndexed?: Date;
}

interface RepositoryStatusProps {
  repositories: RepositoryStatusItem[];
}

export const RepositoryStatus: React.FC<RepositoryStatusProps> = ({
  repositories,
}) => {
  const { t } = useTranslation("indexing-page");

  if (!repositories || repositories.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>{t("repositories.noRepositories")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium">{t("repositories.title")}</h3>
        <p className="text-sm text-muted-foreground mt-1">
          {t("repositories.description")}
        </p>
      </div>

      <div className="space-y-3">
        {repositories.map((item) => (
          <div
            key={item.repository.path}
            className="flex items-center justify-between p-3 border rounded-lg"
            style={{ borderColor: "var(--vscode-panel-border)" }}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium truncate">
                  {item.repository.name}
                </span>
                <span
                  className="text-xs px-2 py-0.5 rounded"
                  style={{
                    backgroundColor: "var(--vscode-badge-background)",
                    color: "var(--vscode-badge-foreground)",
                  }}
                >
                  {t(`repositories.type.${item.repository.type}`)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground truncate mt-1">
                {item.repository.path}
              </p>
            </div>

            <div className="flex items-center gap-3 ml-4">
              <span
                className={`text-sm font-medium ${
                  item.isIndexed > 0 ? "text-green-600" : "text-gray-400"
                }`}
              >
                {item.isIndexed > 0
                  ? t("repositories.indexed")
                  : t("repositories.notIndexed")}
              </span>
              {item.isIndexed > 0 && (
                <span className="text-xs text-muted-foreground">
                  ({item.isIndexed} vectors)
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

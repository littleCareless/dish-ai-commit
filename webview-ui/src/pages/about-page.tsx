import { PageLayout } from "@/components/layout/PageLayout";
import { getAppVersion, getGitSha, isDevelopment } from "@/utils/version";
import React from "react";
import { useTranslation } from "react-i18next";

const packageInfo = {
  displayName: "Dish AI Commit Message Gen",
  license: "MIT",
  author: "littleCareless",
  email: "a790554659@gmail.com",
  repository: {
    url: "https://github.com/littleCareless/dish-ai-commit",
  },
};

const InfoRow: React.FC<{ label: string; children: React.ReactNode }> = ({
  label,
  children,
}) => (
  <div
    className="grid grid-cols-3 gap-4 py-2 border-b"
    style={{ borderColor: "hsl(var(--border))" }}
  >
    <div
      className="font-semibold"
      style={{ color: "hsl(var(--muted-foreground))" }}
    >
      {label}
    </div>
    <div className="col-span-2" style={{ color: "hsl(var(--foreground))" }}>
      {children}
    </div>
  </div>
);

export const AboutPage: React.FC = () => {
  const { t } = useTranslation("about-page");

  const repositoryUrl = packageInfo.repository?.url
    ?.replace("git+", "")
    ?.replace(".git", "");

  return (
    <PageLayout maxWidth="3xl">
      <div>
        <h1 className="text-3xl font-bold mb-2">{packageInfo.displayName}</h1>
        <p className="text-muted-foreground">{t("description")}</p>
      </div>

      <div className="space-y-4">
        <InfoRow label={t("version")}>{getAppVersion()}</InfoRow>
        <InfoRow label={t("license")}>{packageInfo.license}</InfoRow>
        <InfoRow label={t("author")}>{packageInfo.author}</InfoRow>
        <InfoRow label={t("contact")}>
          <a
            href={`mailto:${packageInfo.email}`}
            className="hover:underline"
            style={{ color: "hsl(var(--primary))" }}
          >
            {packageInfo.email}
          </a>
        </InfoRow>
        {repositoryUrl && (
          <InfoRow label={t("repository")}>
            <a
              href={repositoryUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline"
              style={{ color: "hsl(var(--primary))" }}
            >
              {repositoryUrl}
            </a>
          </InfoRow>
        )}

        {/* 构建信息 - 仅在开发环境显示 */}
        {isDevelopment() && (
          <div
            className="pt-4 mt-4 border-t"
            style={{ borderColor: "hsl(var(--border))" }}
          >
            <div
              className="text-xs space-y-1"
              style={{ color: "hsl(var(--muted-foreground))" }}
            >
              <div
                className="font-semibold"
                style={{ color: "hsl(var(--foreground))" }}
              >
                开发信息
              </div>
              <div>版本: {getAppVersion()}</div>
              {getGitSha() && (
                <div>Git SHA: {getGitSha?.()?.substring(0, 7)}</div>
              )}
              <div>构建模式: 开发环境</div>
            </div>
          </div>
        )}
      </div>
    </PageLayout>
  );
};

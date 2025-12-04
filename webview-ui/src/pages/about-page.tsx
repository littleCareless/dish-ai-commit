import { PageLayout } from "@/components/layout/PageLayout";
import React from "react";
import { useTranslation } from "react-i18next";

const packageInfo = {
  displayName: "Dish AI Commit Message Gen",
  version: "0.54.0",
  license: "MIT",
  author: "littleCareless",
  email: "littlecareless@gmail.com",
  repository: {
    url: "https://github.com/littleCareless/dish-ai-commit",
  },
};

const InfoRow: React.FC<{ label: string; children: React.ReactNode }> = ({
  label,
  children,
}) => (
  <div className="grid grid-cols-3 gap-4 py-2 border-b border-gray-200 dark:border-gray-700">
    <div className="font-semibold text-gray-600 dark:text-gray-300">
      {label}
    </div>
    <div className="col-span-2 text-gray-800 dark:text-gray-100">
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
        <InfoRow label={t("version")}>{packageInfo.version}</InfoRow>
        <InfoRow label={t("license")}>{packageInfo.license}</InfoRow>
        <InfoRow label={t("author")}>{packageInfo.author}</InfoRow>
        <InfoRow label={t("contact")}>
          <a
            href={`mailto:${packageInfo.email}`}
            className="text-blue-500 hover:underline"
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
              className="text-blue-500 hover:underline"
            >
              {repositoryUrl}
            </a>
          </InfoRow>
        )}
      </div>
    </PageLayout>
  );
};

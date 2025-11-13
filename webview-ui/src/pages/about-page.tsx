import React from "react";
import { useTranslation } from "react-i18next";

const packageInfo = {
  displayName: "Dish AI Commit Message Gen",
  version: "0.54.0",
  description:
    "Dish AI Commit 是一款功能强大的 VSCode 扩展，旨在简化您的提交工作流程。通过利用 20 多种 AI 服务的能力，它能自动为 Git 和 SVN 生成标准化、高质量的提交消息。无论您是从事小型个人项目还是大型企业级应用，此扩展都能帮助您维护清晰、规范且易于理解的提交历史。它支持 19 种语言，并提供代码审查、周报、分支命名和 PR 摘要等丰富功能，以提高您的生产力。",
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
    <div className="p-6  dark:bg-gray-800 h-full">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
        {packageInfo.displayName}
      </h1>
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        {t("description", {
          defaultValue: packageInfo.description,
        })}
      </p>

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
    </div>
  );
};

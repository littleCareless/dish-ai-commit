import { PageHeader, PageLayout } from "@/components/layout/PageLayout";
import React from "react";
import { useTranslation } from "react-i18next";

export const ExperimentalPage: React.FC = () => {
  const { t } = useTranslation("experimental-page");
  return (
    <PageLayout>
      <PageHeader title={t("title")} description={t("description")} />
    </PageLayout>
  );
};

import { PageHeader, PageLayout } from "@/components/layout/PageLayout";
import { ModelCatalogViewer } from "@/components/settings/ModelCatalogViewer";
import { ModelCustomSettings } from "@/pages/settings/ModelCustomSettings";
import React from "react";
import { useTranslation } from "react-i18next";

export const ModelRegistryPage: React.FC = () => {
  const { t } = useTranslation("translation");

  return (
    <PageLayout maxWidth="5xl">
      <PageHeader
        title={t("nav.modelRegistry")}
        description={t("nav.modelRegistry_description")}
      />
      <ModelCustomSettings />
      <ModelCatalogViewer />
    </PageLayout>
  );
};

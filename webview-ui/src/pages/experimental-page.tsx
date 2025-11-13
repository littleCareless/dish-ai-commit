import React from "react";
import { useTranslation } from "react-i18next";

export const ExperimentalPage: React.FC = () => {
  const { t } = useTranslation("experimental-page");
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <p className="mt-2">{t("description")}</p>
    </div>
  );
};

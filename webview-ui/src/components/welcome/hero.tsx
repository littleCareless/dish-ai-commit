import { useState } from "react";
import { useTranslation } from "react-i18next";

declare global {
  interface Window {
    IMAGES_BASE_URI?: string;
  }
}

const RooHero = () => {
  const { t } = useTranslation("welcome-page");
  const [imagesBaseUri] = useState(() => {
    const w = window;
    return w.IMAGES_BASE_URI || "";
  });

  return (
    <div className="flex flex-col items-center justify-center pb-4 forced-color-adjust-none">
      <div
        style={{
          backgroundColor: "var(--vscode-foreground)",
          WebkitMaskImage: `url('${imagesBaseUri}/roo-logo.svg')`,
          WebkitMaskRepeat: "no-repeat",
          WebkitMaskSize: "contain",
          maskImage: `url('${imagesBaseUri}/roo-logo.svg')`,
          maskRepeat: "no-repeat",
          maskSize: "contain",
        }}
        className="mx-auto"
      >
        <img
          src={imagesBaseUri + "/roo-logo.svg"}
          alt={t("images.rooLogoAlt")}
          className="h-8 opacity-0"
        />
      </div>
    </div>
  );
};

export default RooHero;

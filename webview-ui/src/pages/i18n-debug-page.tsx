import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useExtensionState } from "@/context/ExtensionStateContext";
import React from "react";
import { useTranslation } from "react-i18next";

/**
 * i18n 调试页面 - 用于诊断多语言问题
 */
export const I18nDebugPage: React.FC = () => {
  const { t, i18n, ready } = useTranslation("welcome-page");
  const { language: extensionLanguage, setLanguage } = useExtensionState();

  const [renderCount, setRenderCount] = React.useState(0);

  React.useEffect(() => {
    setRenderCount((prev) => prev + 1);
    console.log(
      "zh-cn.translation keys:",
      i18n.getResourceBundle("zh-cn", "translation"),
    );
    console.log("当前语言:", i18n.language);
    console.log("所有资源:", i18n.getDataByLanguage(i18n.language));
    console.log("资源包:", i18n.getResourceBundle("zh-cn", "translation"));

    console.log("i18n.languages:", i18n.languages);
    console.log("i18n.language:", i18n.language);
    console.log(
      "i18n.hasResourceBundle('zh-cn', 'welcome-page'):",
      i18n.hasResourceBundle("zh-cn", "welcome-page"),
    );

    console.log(
      "🔍 [Deep Inspect] zh-cn/welcome-page:",
      JSON.stringify(i18n.getResourceBundle("zh-cn", "welcome-page"), null, 2),
    );

    // 测试显式命名空间调用
    console.log(
      "🔍 [Test Explicit] t('welcome-page:title'):",
      i18n.t("welcome-page:title"),
    );
  }, [i18n.language]);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">i18n 调试页面</h1>

      <Card>
        <CardHeader>
          <CardTitle>当前状态 {ready}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div>
            <strong>i18n.language:</strong> {i18n.language}
          </div>
          <div>
            <strong>defaultNS:</strong> {i18n.options.defaultNS}{" "}
            {i18n.options.ns}
          </div>
          <div>
            <strong>extensionLanguage:</strong> {extensionLanguage}
          </div>
          <div>
            <strong>渲染次数:</strong> {renderCount}
          </div>
          <div>
            <strong>i18n.isInitialized:</strong>{" "}
            {i18n.isInitialized ? "✅" : "❌"}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>可用语言</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="bg-muted p-4 rounded overflow-auto">
            {JSON.stringify(i18n.options.resources, null, 2)}
          </pre>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>翻译测试</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <strong>t("nav.settings"):</strong> {t("nav.settings")}
          </div>
          <div>
            <strong>t("nav.notifications"):</strong> {t("nav.notifications")}
          </div>
          <div>
            <strong>t("nav.language"):</strong> {t("nav.language")}
          </div>
          <div>
            <strong>t("title"):</strong> {t("title")}
            <strong>强制指定NS:</strong> {t("welcome-page:title")}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>手动切换语言</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button
              onClick={() => {
                console.log("[Debug] Switching to en");
                setLanguage("en");
              }}
            >
              切换到英语 (en)
            </Button>
            <Button
              onClick={() => {
                console.log("[Debug] Switching to zh-cn");
                setLanguage("zh-cn");
              }}
            >
              切换到中文 (zh-cn)
            </Button>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={async () => {
                console.log("[Debug] Direct i18n.changeLanguage to en");
                await i18n.changeLanguage("en");
                console.log("[Debug] Changed to:", i18n.language);
              }}
            >
              直接调用 i18n.changeLanguage("en")
            </Button>
            <Button
              variant="outline"
              onClick={async () => {
                console.log("[Debug] Direct i18n.changeLanguage to zh-cn");
                await i18n.changeLanguage("zh-cn");
                console.log("[Debug] Changed to:", i18n.language);
              }}
            >
              直接调用 i18n.changeLanguage("zh-cn")
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>资源检查</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div>
              <strong>英语资源存在:</strong>{" "}
              {i18n.hasResourceBundle("en", "translation") ? "✅" : "❌"}
            </div>
            <div>
              <strong>中文资源存在 (zh-cn):</strong>{" "}
              {i18n.hasResourceBundle("zh-cn", "translation") ? "✅" : "❌"}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default I18nDebugPage;

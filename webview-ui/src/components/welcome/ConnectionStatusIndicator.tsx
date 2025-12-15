import { Check, Clock, Key, Loader2, Wifi, WifiOff, X } from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

type ConnectionStatus = "idle" | "connecting" | "success" | "error";
type ErrorType = "auth" | "network" | "timeout" | "unknown";

interface ConnectionStatusIndicatorProps {
  status: ConnectionStatus;
  errorType?: ErrorType;
  message?: string;
  duration?: number;
  className?: string;
}

/**
 * 连接状态指示器 - 显示配置验证状态
 */
export const ConnectionStatusIndicator = ({
  status,
  errorType,
  message,
  duration,
  className = "",
}: ConnectionStatusIndicatorProps) => {
  const { t } = useTranslation("welcome-page");

  const config = useMemo(() => {
    switch (status) {
      case "connecting":
        return {
          icon: <Loader2 className="w-4 h-4 animate-spin" />,
          text: t("connection.testing"),
          color: "var(--vscode-charts-blue)",
          bgColor: "var(--vscode-inputValidation-infoBackground)",
        };
      case "success":
        return {
          icon: <Check className="w-4 h-4" />,
          text: message || t("connection.success"),
          color: "var(--vscode-charts-green)",
          bgColor: "var(--vscode-inputValidation-infoBackground)",
        };
      case "error":
        return {
          icon: getErrorIcon(errorType),
          text: message || getErrorMessage(errorType, t),
          color: "var(--vscode-errorForeground)",
          bgColor: "var(--vscode-inputValidation-errorBackground)",
        };
      default:
        return null;
    }
  }, [status, errorType, message, t]);

  if (!config) return null;

  return (
    <div
      className={`flex items-center gap-2 p-2 rounded-md text-sm ${className}`}
      style={{
        backgroundColor: config.bgColor,
        color: config.color,
      }}
    >
      {config.icon}
      <span className="flex-1">{config.text}</span>
      {status === "success" && duration && (
        <span
          className="text-xs opacity-70"
          style={{ color: "var(--vscode-descriptionForeground)" }}
        >
          {duration}ms
        </span>
      )}
    </div>
  );
};

/**
 * 根据错误类型获取图标
 */
function getErrorIcon(errorType?: ErrorType) {
  switch (errorType) {
    case "auth":
      return <Key className="w-4 h-4" />;
    case "network":
      return <WifiOff className="w-4 h-4" />;
    case "timeout":
      return <Clock className="w-4 h-4" />;
    default:
      return <X className="w-4 h-4" />;
  }
}

/**
 * 根据错误类型获取消息
 */
function getErrorMessage(
  errorType: ErrorType | undefined,
  t: (key: string) => string,
): string {
  switch (errorType) {
    case "auth":
      return t("connection.error.auth");
    case "network":
      return t("connection.error.network");
    case "timeout":
      return t("connection.error.timeout");
    default:
      return t("connection.error.unknown");
  }
}

interface LocalServiceBadgeProps {
  available: boolean;
  name: string;
  className?: string;
}

/**
 * 本地服务检测徽章
 */
export const LocalServiceBadge = ({
  available,
  name,
  className = "",
}: LocalServiceBadgeProps) => {
  const { t } = useTranslation("welcome-page");

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs ${className}`}
      style={{
        backgroundColor: available
          ? "var(--vscode-testing-iconPassed)"
          : "var(--vscode-testing-iconFailed)",
        color: "var(--vscode-button-foreground)",
        opacity: available ? 1 : 0.6,
      }}
    >
      {available ? (
        <Wifi className="w-3 h-3" />
      ) : (
        <WifiOff className="w-3 h-3" />
      )}
      <span>{name}</span>
      <span className="opacity-80">
        {available ? t("service.detected") : t("service.notDetected")}
      </span>
    </div>
  );
};

export default ConnectionStatusIndicator;

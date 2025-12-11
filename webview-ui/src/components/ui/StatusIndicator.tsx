import {
  AlertTriangle,
  Check,
  Info,
  Loader2,
  LucideIcon,
  X,
} from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

/**
 * 状态类型
 */
export type StatusType =
  | "idle"
  | "loading"
  | "success"
  | "error"
  | "warning"
  | "info";

/**
 * 状态配置
 */
interface StatusConfig {
  icon: LucideIcon;
  color: string;
  bgColor: string;
  animate?: boolean;
}

/**
 * 状态配置映射
 */
const statusConfigs: Record<StatusType, StatusConfig> = {
  idle: {
    icon: Info,
    color: "var(--vscode-descriptionForeground)",
    bgColor: "transparent",
  },
  loading: {
    icon: Loader2,
    color: "var(--vscode-charts-blue)",
    bgColor: "var(--vscode-inputValidation-infoBackground)",
    animate: true,
  },
  success: {
    icon: Check,
    color: "var(--vscode-charts-green)",
    bgColor: "var(--vscode-inputValidation-infoBackground)",
  },
  error: {
    icon: X,
    color: "var(--vscode-errorForeground)",
    bgColor: "var(--vscode-inputValidation-errorBackground)",
  },
  warning: {
    icon: AlertTriangle,
    color: "var(--vscode-charts-yellow)",
    bgColor: "var(--vscode-inputValidation-warningBackground)",
  },
  info: {
    icon: Info,
    color: "var(--vscode-charts-blue)",
    bgColor: "var(--vscode-inputValidation-infoBackground)",
  },
};

interface StatusIndicatorProps {
  /** 状态类型 */
  status: StatusType;
  /** 可选的消息文本 */
  message?: string;
  /** 可选的详情（如耗时） */
  details?: string;
  /** 是否显示为内联样式 */
  inline?: boolean;
  /** 自定义类名 */
  className?: string;
  /** 是否只显示图标 */
  iconOnly?: boolean;
}

/**
 * 状态指示器组件 - 统一的状态视觉反馈
 */
export const StatusIndicator = ({
  status,
  message,
  details,
  inline = false,
  className = "",
  iconOnly = false,
}: StatusIndicatorProps) => {
  const { t } = useTranslation("common");

  const config = statusConfigs[status];
  const Icon = config.icon;

  const defaultMessages: Record<StatusType, string> = useMemo(
    () => ({
      idle: t("status.idle", "就绪"),
      loading: t("status.loading", "处理中..."),
      success: t("status.success", "成功"),
      error: t("status.error", "失败"),
      warning: t("status.warning", "警告"),
      info: t("status.info", "提示"),
    }),
    [t],
  );

  const displayMessage = message || defaultMessages[status];

  // 只显示图标模式
  if (iconOnly) {
    return (
      <div
        className={`inline-flex items-center justify-center ${className}`}
        style={{ color: config.color }}
        title={displayMessage}
      >
        <Icon className={`w-4 h-4 ${config.animate ? "animate-spin" : ""}`} />
      </div>
    );
  }

  // 内联模式
  if (inline) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 ${className}`}
        style={{ color: config.color }}
      >
        <Icon className={`w-4 h-4 ${config.animate ? "animate-spin" : ""}`} />
        <span className="text-sm">{displayMessage}</span>
        {details && (
          <span
            className="text-xs opacity-70"
            style={{ color: "var(--vscode-descriptionForeground)" }}
          >
            {details}
          </span>
        )}
      </span>
    );
  }

  // 块级模式（默认）
  return (
    <div
      className={`flex items-center gap-2 p-2 rounded-md text-sm ${className}`}
      style={{
        backgroundColor: config.bgColor,
        color: config.color,
      }}
    >
      <Icon
        className={`w-4 h-4 flex-shrink-0 ${config.animate ? "animate-spin" : ""}`}
      />
      <span className="flex-1">{displayMessage}</span>
      {details && (
        <span
          className="text-xs"
          style={{ color: "var(--vscode-descriptionForeground)" }}
        >
          {details}
        </span>
      )}
    </div>
  );
};

export default StatusIndicator;

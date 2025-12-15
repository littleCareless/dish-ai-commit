import { Check, LucideIcon } from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

/**
 * 阶段状态
 */
export type StageStatus = "pending" | "active" | "completed" | "error";

/**
 * 阶段定义
 */
export interface Stage {
  id: string;
  labelKey: string;
  icon?: LucideIcon;
}

interface ProgressStagesProps {
  /** 阶段列表 */
  stages: Stage[];
  /** 当前阶段索引 */
  currentStageIndex: number;
  /** 当前阶段状态（可选，默认 active） */
  currentStageStatus?: StageStatus;
  /** 是否显示为紧凑模式 */
  compact?: boolean;
  /** 自定义类名 */
  className?: string;
}

/**
 * 分阶段进度组件 - 显示多步骤操作的进度
 */
export const ProgressStages = ({
  stages,
  currentStageIndex,
  currentStageStatus = "active",
  compact = false,
  className = "",
}: ProgressStagesProps) => {
  const { t } = useTranslation();

  const stageItems = useMemo(() => {
    return stages.map((stage, index) => {
      let status: StageStatus;
      if (index < currentStageIndex) {
        status = "completed";
      } else if (index === currentStageIndex) {
        status = currentStageStatus;
      } else {
        status = "pending";
      }
      return { ...stage, status, index };
    });
  }, [stages, currentStageIndex, currentStageStatus]);

  if (compact) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        {stageItems.map((stage, index) => (
          <div key={stage.id} className="flex items-center">
            <StageIndicatorCompact stage={stage} t={t} />
            {index < stageItems.length - 1 && (
              <div
                className="w-4 h-0.5 mx-1"
                style={{
                  backgroundColor:
                    stage.status === "completed"
                      ? "var(--vscode-charts-green)"
                      : "var(--vscode-panel-border)",
                }}
              />
            )}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {stageItems.map((stage, index) => (
        <div key={stage.id} className="flex items-start gap-3">
          <StageIndicatorFull
            stage={stage}
            isLast={index === stageItems.length - 1}
          />
          <div className="flex-1 pt-0.5">
            <span
              className={`text-sm ${stage.status === "active" ? "font-medium" : ""}`}
              style={{
                color:
                  stage.status === "completed"
                    ? "var(--vscode-charts-green)"
                    : stage.status === "active"
                      ? "var(--vscode-foreground)"
                      : stage.status === "error"
                        ? "var(--vscode-errorForeground)"
                        : "var(--vscode-descriptionForeground)",
              }}
            >
              {t(stage.labelKey)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};

/**
 * 紧凑模式的阶段指示器
 */
function StageIndicatorCompact({
  stage,
  t,
}: {
  stage: Stage & { status: StageStatus; index: number };
  t: (key: string) => string;
}) {
  const getStyle = () => {
    switch (stage.status) {
      case "completed":
        return {
          bg: "var(--vscode-charts-green)",
          color: "var(--vscode-editor-background)",
        };
      case "active":
        return {
          bg: "var(--vscode-button-background)",
          color: "var(--vscode-button-foreground)",
        };
      case "error":
        return {
          bg: "var(--vscode-errorForeground)",
          color: "var(--vscode-editor-background)",
        };
      default:
        return {
          bg: "var(--vscode-panel-border)",
          color: "var(--vscode-descriptionForeground)",
        };
    }
  };

  const style = getStyle();

  return (
    <div
      className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium"
      style={{ backgroundColor: style.bg, color: style.color }}
      title={t(stage.labelKey)}
    >
      {stage.status === "completed" ? (
        <Check className="w-3.5 h-3.5" />
      ) : (
        stage.index + 1
      )}
    </div>
  );
}

/**
 * 完整模式的阶段指示器
 */
function StageIndicatorFull({
  stage,
  isLast,
}: {
  stage: Stage & { status: StageStatus; index: number };
  isLast: boolean;
}) {
  const getStyle = () => {
    switch (stage.status) {
      case "completed":
        return {
          bg: "var(--vscode-charts-green)",
          color: "var(--vscode-editor-background)",
          lineColor: "var(--vscode-charts-green)",
        };
      case "active":
        return {
          bg: "var(--vscode-button-background)",
          color: "var(--vscode-button-foreground)",
          lineColor: "var(--vscode-panel-border)",
        };
      case "error":
        return {
          bg: "var(--vscode-errorForeground)",
          color: "var(--vscode-editor-background)",
          lineColor: "var(--vscode-panel-border)",
        };
      default:
        return {
          bg: "var(--vscode-panel-border)",
          color: "var(--vscode-descriptionForeground)",
          lineColor: "var(--vscode-panel-border)",
        };
    }
  };

  const style = getStyle();

  return (
    <div className="flex flex-col items-center">
      <div
        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
          stage.status === "active" ? "ring-2 ring-offset-1" : ""
        }`}
        style={{
          backgroundColor: style.bg,
          color: style.color,
          // @ts-expect-error ring variables
          "--tw-ring-color": "var(--vscode-button-background)",
          "--tw-ring-offset-color": "var(--vscode-editor-background)",
        }}
      >
        {stage.status === "completed" ? (
          <Check className="w-3.5 h-3.5" />
        ) : (
          stage.index + 1
        )}
      </div>
      {!isLast && (
        <div
          className="w-0.5 h-4 mt-1"
          style={{ backgroundColor: style.lineColor }}
        />
      )}
    </div>
  );
}

export default ProgressStages;

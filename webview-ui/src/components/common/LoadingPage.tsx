import React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "../../lib/utils";

interface LoadingPageProps {
  message?: string;
  className?: string;
}

export const LoadingPage: React.FC<LoadingPageProps> = ({
  message = "加载中...",
  className,
}) => {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center h-full min-h-[400px]",
        className,
      )}
    >
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <div className="text-center">
          <p className="text-lg font-medium text-foreground">{message}</p>
          <p className="text-sm text-muted-foreground mt-1">
            请稍候，正在初始化...
          </p>
        </div>
      </div>
    </div>
  );
};

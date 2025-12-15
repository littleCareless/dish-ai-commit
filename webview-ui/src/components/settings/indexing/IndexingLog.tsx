import { ScrollArea } from "@/components/ui/scroll-area";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";

interface LogEntry {
  id: number;
  message: string;
  timestamp: string;
}

interface IndexingLogProps {
  entries: LogEntry[];
  maxHeight?: string;
}

export const IndexingLog: React.FC<IndexingLogProps> = ({
  entries,
  maxHeight = "200px",
}) => {
  const { t } = useTranslation();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Auto-scroll to bottom when new entries are added
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries]);

  if (entries.length === 0) {
    return (
      <div
        className="flex items-center justify-center p-4 text-sm text-gray-500 border rounded-md"
        style={{ minHeight: "100px" }}
      >
        {t("indexing-page:log.empty")}
      </div>
    );
  }

  return (
    <ScrollArea className="border rounded-md p-2" style={{ maxHeight }}>
      <div ref={scrollRef} className="space-y-1 font-mono text-xs">
        {entries.map((entry) => (
          <div
            key={entry.id}
            className="flex items-start gap-2 py-0.5 border-b border-gray-100 last:border-0"
          >
            <span className="text-gray-400 shrink-0">{entry.timestamp}</span>
            <span className="text-gray-700 break-all">{entry.message}</span>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
};

import React, { useState, useRef } from 'react';

/**
 * 拖拽调试组件
 * 用于监控和记录所有拖拽事件，帮助诊断拖拽功能问题
 */
export const DragDropDebugger = {
  logs: [] as Array<{ time: string; level: string; message: string; data?: any }>,

  log: (level: string, message: string, data?: any) => {
    const time = new Date().toLocaleTimeString();
    const logEntry = { time, level, message, data };
    DragDropDebugger.logs.push(logEntry);
    
    // 保持最多 100 条日志
    if (DragDropDebugger.logs.length > 100) {
      DragDropDebugger.logs.shift();
    }
    
    console.log(`[${level}] ${message}`, data);
  },

  getLogs: () => DragDropDebugger.logs,
  
  clearLogs: () => {
    DragDropDebugger.logs = [];
  },
};

interface DebugPanelProps {
  isOpen?: boolean;
}

export const DragDropDebugPanel: React.FC<DebugPanelProps> = ({ isOpen = false }) => {
  const [open, setOpen] = useState(isOpen);
  const logsRef = useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (logsRef.current) {
      logsRef.current.scrollTop = logsRef.current.scrollHeight;
    }
  }, []);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-50 p-2 bg-primary text-primary-foreground rounded-lg text-xs hover:opacity-80"
      >
        🐛 拖拽调试
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 h-64 bg-background border border-border rounded-lg shadow-lg flex flex-col">
      <div className="flex items-center justify-between p-2 border-b">
        <div className="text-sm font-medium">🐛 拖拽调试日志</div>
        <div className="flex gap-2">
          <button
            onClick={() => DragDropDebugger.clearLogs()}
            className="text-xs px-2 py-1 hover:bg-muted rounded"
          >
            清除
          </button>
          <button
            onClick={() => setOpen(false)}
            className="text-xs px-2 py-1 hover:bg-muted rounded"
          >
            ✕
          </button>
        </div>
      </div>
      
      <div 
        ref={logsRef}
        className="flex-1 overflow-y-auto p-2 font-mono text-xs space-y-1"
      >
        {DragDropDebugger.logs.length === 0 ? (
          <div className="text-muted-foreground">等待拖拽事件...</div>
        ) : (
          DragDropDebugger.logs.map((log, index) => (
            <div
              key={index}
              className={`${
                log.level === 'error' ? 'text-red-500' :
                log.level === 'warn' ? 'text-yellow-500' :
                'text-green-500'
              }`}
            >
              <span className="text-muted-foreground">[{log.time}]</span> {log.message}
              {log.data && <span className="text-muted-foreground ml-1">{JSON.stringify(log.data)}</span>}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

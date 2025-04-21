import { useState, useEffect } from "react"; // 添加 useEffect
import { DatePicker } from "@arco-design/web-react";
const { RangePicker } = DatePicker;
import "@arco-design/web-react/dist/css/arco.css";
import dayjs from "dayjs";
import { Editor } from "@/components/Editor";
import { Button } from "@/components/ui/button";
import { Save, FileDown, Wand2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
// import { getMessageType } from "@/constants";
// import "vscode-webview";
import { vscode } from "@/lib/vscode";

function App() {
  const [content, setContent] = useState("");
  const [dateRange, setDateRange] = useState<dayjs.Dayjs[]>([]);
  const { toast } = useToast();

  // 添加消息监听
  useEffect(() => {
    // 监听来自 VSCode 的消息
    const messageHandler = (event: MessageEvent) => {
      const message = event.data;
      console.log("Received message from extension:", message);

      switch (message.command) {
        case "report":
          // 更新编辑器内容
          console.log("更新编辑器内容", message.data);
          setContent(message.data);
          break;
        // 可以添加其他消息类型的处理
      }
    };

    window.addEventListener("message", messageHandler);

    // 清理函数
    return () => {
      window.removeEventListener("message", messageHandler);
    };
  }, []);

  const handleSave = () => {
    // Send save message to VSCode
    console.log("vscode", vscode);
    if (vscode) {
      vscode.postMessage({
        command: "save", // 使用 command 而不是 type
        data: { content },
      });
    }
    toast({
      title: "Report saved",
      description: "Your report has been saved successfully.",
    });
  };

  const handleExport = () => {
    // Send export message to VSCode
    if (vscode) {
      vscode.postMessage({
        command: "export", // 使用 command 而不是 type
        data: { content },
      });
    }
    toast({
      title: "Report exported",
      description: "Your report has been exported successfully.",
    });
  };

  const handleGenerate = () => {
    // Send generate message to VSCode
    console.log("generate", vscode);
    if (vscode) {
      // 确保有选择日期范围
      if (!dateRange || dateRange.length !== 2) {
        toast({
          title: "Error",
          description: "Please select a date range first",
          variant: "destructive",
        });
        return;
      }

      vscode.postMessage({
        command: "generate", // 使用 command 而不是 type
        data: {
          content,
          period: {
            startDate: dateRange[0].format("YYYY-MM-DD"),
            endDate: dateRange[1].format("YYYY-MM-DD"),
          },
        },
      });
    }
    toast({
      title: "Generating report",
      description: "Your report is being generated...",
    });
  };

  const handleDateRangeChange = (
    _dateString: string[],
    dates: dayjs.Dayjs[]
  ) => {
    setDateRange(dates); // 保存选中的日期范围
    if (vscode && dates) {
      vscode.postMessage({
        command: "dateChange", // 使用 command 而不是 type
        data: {
          startDate: dates[0],
          endDate: dates[1],
        },
      });
    }
  };

  return (
    <div className="container max-w-5xl p-6 mx-auto">
      <h1 className="mb-8 text-3xl font-bold">Weekly Report Generator</h1>

      <div className="space-y-6">
        <div className="p-6 border rounded-lg bg-card">
          <h2 className="mb-4 text-xl font-semibold">Select Date Range</h2>
          <RangePicker
            style={{ width: "100%" }}
            onChange={handleDateRangeChange}
            showTime={false}
            format="YYYY-MM-DD"
            shortcutsPlacementLeft
            shortcuts={[
              {
                text: "本周",
                value: () => [
                  dayjs().startOf("week").add(1, "day"), // 周一
                  dayjs().endOf("week").add(1, "day"), // 周日
                ],
              },
              {
                text: "上周",
                value: () => [
                  dayjs().subtract(1, "week").startOf("week").add(1, "day"),
                  dayjs().subtract(1, "week").endOf("week").add(1, "day"),
                ],
              },
              {
                text: "上两周",
                value: () => [
                  dayjs().subtract(2, "week").startOf("week").add(1, "day"),
                  dayjs().subtract(1, "week").endOf("week").add(1, "day"),
                ],
              },
            ]}
          />
        </div>

        <div className="p-6 border rounded-lg bg-card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Report Content</h2>
            <div className="flex gap-2">
              <Button
                onClick={handleGenerate}
                size="sm"
                variant="default"
              >
                <Wand2 className="w-4 h-4 mr-2" />
                Generate
              </Button>
              <Button
                onClick={handleSave}
                size="sm"
              >
                <Save className="w-4 h-4 mr-2" />
                Save
              </Button>
              <Button
                onClick={handleExport}
                size="sm"
                variant="outline"
              >
                <FileDown className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
          <Editor
            content={content}
            onChange={setContent}
          />
        </div>
      </div>
    </div>
  );
}

export default App;

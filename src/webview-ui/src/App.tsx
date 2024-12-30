import { useState } from "react";
import { DatePicker } from "@arco-design/web-react";
const { RangePicker } = DatePicker;
import "@arco-design/web-react/dist/css/arco.css";
import dayjs from "dayjs";
import { Editor } from "@/components/Editor";
import { Button } from "@/components/ui/button";
import { Save, FileDown, Wand2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getMessageType } from "@/constants";

function App() {
  const [content, setContent] = useState("");
  const { toast } = useToast();

  const handleSave = () => {
    // Send save message to VSCode
    if (window.vscode) {
      window.vscode.postMessage({
        type: getMessageType("save"),
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
    if (window.vscode) {
      window.vscode.postMessage({
        type: getMessageType("export"),
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
    if (window.vscode) {
      window.vscode.postMessage({
        type: getMessageType("generate"),
        data: { content },
      });
    }
    toast({
      title: "Generating report",
      description: "Your report is being generated...",
    });
  };

  const handleDateRangeChange = (dates: any[]) => {
    if (window.vscode && dates) {
      window.vscode.postMessage({
        type: getMessageType("dateChange"),
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
                text: '本周',
                value: () => [
                  dayjs().startOf('week').add(1, 'day'),  // 周一
                  dayjs().endOf('week').add(1, 'day')     // 周日
                ],
              },
              {
                text: '上周',
                value: () => [
                  dayjs().subtract(1, 'week').startOf('week').add(1, 'day'),
                  dayjs().subtract(1, 'week').endOf('week').add(1, 'day')
                ],
              },
              {
                text: '上两周',
                value: () => [
                  dayjs().subtract(2, 'week').startOf('week').add(1, 'day'),
                  dayjs().subtract(1, 'week').endOf('week').add(1, 'day')
                ],
              }
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

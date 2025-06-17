import { useState, useEffect } from "react"; // React import for SettingsPage
import { Select as ArcoSelect, DatePicker } from "@arco-design/web-react";
const { RangePicker } = DatePicker;
import "@arco-design/web-react/dist/css/arco.css";
import dayjs from "dayjs";
import { Editor } from "@/components/Editor";
import { Button } from "@/components/ui/button"; // This is for WeeklyReportPage, keep it.

import { Save, FileDown, Wand2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { vscode } from "@/lib/vscode";

// Define a more specific type for setting values

function WeeklyReportPage() {
  const [content, setContent] = useState("");
  const [dateRange, setDateRange] = useState<dayjs.Dayjs[]>([]);
  const [allUsers, setAllUsers] = useState<string[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  // const [currentUser, setCurrentUser] = useState<string>(""); // 移除未使用的 currentUser state
  const { toast } = useToast();

  // 添加消息监听
  useEffect(() => {
    // 请求用户列表
    if (vscode) {
      vscode.postMessage({ command: "getUsers" });
    }

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
        case "usersList": // 新增处理用户列表的 case
          console.log("Received users list:", message.data);
          setAllUsers(message.data.users || []);
          if (
            message.data.currentUser &&
            !selectedUsers.includes(message.data.currentUser)
          ) {
            // 确保只在初始时或 currentUser 变化时设置
            setSelectedUsers([message.data.currentUser]); // 默认选中当前用户
          }
          break;
        // 可以添加其他消息类型的处理
      }
    };

    window.addEventListener("message", messageHandler);

    // 清理函数
    return () => {
      window.removeEventListener("message", messageHandler);
    };
  }, []); // 空依赖数组，确保只在挂载和卸载时执行

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

      if (selectedUsers.length === 0) {
        // 检查是否选择了用户
        toast({
          title: "Error",
          description: "Please select at least one team member.",
          variant: "destructive",
        });
        return;
      }

      // 提醒用户使用特定 prompt
      toast({
        title: "Team Report Generation",
        description:
          "Please ensure you are using a prompt suitable for team reports.",
        duration: 5000, // 持续时间长一点
      });

      vscode.postMessage({
        command: "generateTeamReport", // 修改 command
        data: {
          content,
          period: {
            startDate: dateRange[0].format("YYYY-MM-DD"),
            endDate: dateRange[1].format("YYYY-MM-DD"),
          },
          users: selectedUsers, // 添加选中用户
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
          <h2 className="mb-4 text-xl font-semibold">Select Team Members</h2>
          <ArcoSelect
            mode="multiple"
            placeholder="Select team members"
            style={{ width: "100%" }}
            value={selectedUsers}
            onChange={setSelectedUsers}
            allowClear
            tokenSeparators={[",", " ", "|"]}
          >
            {allUsers.map((user) => (
              <ArcoSelect.Option
                key={user}
                value={user}
              >
                {user}
              </ArcoSelect.Option>
            ))}
          </ArcoSelect>
          <p className="mt-2 text-sm text-muted-foreground">
            Default selected user is the current local user. Please use a
            team-specific prompt for best results.
          </p>
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

export default WeeklyReportPage;

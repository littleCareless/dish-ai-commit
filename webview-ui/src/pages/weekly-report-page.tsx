import { Editor } from "@/components/Editor";
import { Button } from "@/components/ui/button";
import { Select as ArcoSelect, DatePicker } from "@arco-design/web-react";
import "@arco-design/web-react/dist/css/arco.css";
import dayjs from "dayjs";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
const { RangePicker } = DatePicker;

import { useToast } from "@/hooks/use-toast";
import { postMessage, useMessageHandler } from "@/utils/vscode";
import { FileDown, Save, Wand2 } from "lucide-react";

// Define a more specific type for setting values

function WeeklyReportPage() {
  const { t } = useTranslation("weeklyReport-page");
  const [content, setContent] = useState("");
  const [dateRange, setDateRange] = useState<dayjs.Dayjs[]>([]);
  const [allUsers, setAllUsers] = useState<string[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const { toast } = useToast();

  // 添加消息监听
  useEffect(() => {
    // 请求用户列表
    postMessage("getUsers");
  }, []);

  useMessageHandler(
    useCallback(
      (event: MessageEvent) => {
        const message = event.data;

        switch (message.command) {
          case "report":
            // 更新编辑器内容
            setContent(message.data);
            break;
          case "usersList": // 新增处理用户列表的 case
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
      },
      [selectedUsers],
    ),
  );

  const handleSave = () => {
    // Send save message to VSCode
    postMessage("save", { content });
    toast({
      title: t("toast.saveSuccessTitle"),
      description: t("toast.saveSuccessDescription"),
    });
  };

  const handleExport = () => {
    // Send export message to VSCode
    postMessage("export", { content });
    toast({
      title: t("toast.exportSuccessTitle"),
      description: t("toast.exportSuccessDescription"),
    });
  };

  const handleGenerate = () => {
    // Send generate message to VSCode
    // 确保有选择日期范围
    if (!dateRange || dateRange.length !== 2) {
      toast({
        title: t("toast.error"),
        description: t("toast.selectDateRange"),
        variant: "destructive",
      });
      return;
    }

    if (selectedUsers.length === 0) {
      // 检查是否选择了用户
      toast({
        title: t("toast.error"),
        description: t("toast.selectTeamMember"),
        variant: "destructive",
      });
      return;
    }

    // 提醒用户使用特定 prompt
    toast({
      title: t("toast.teamReportGenerationTitle"),
      description: t("toast.teamReportGenerationDescription"),
      duration: 5000, // 持续时间长一点
    });

    postMessage("generateTeamReport", {
      content,
      period: {
        startDate: dateRange[0].format("YYYY-MM-DD"),
        endDate: dateRange[1].format("YYYY-MM-DD"),
      },
      users: selectedUsers, // 添加选中用户
    });
    toast({
      title: t("toast.generatingTitle"),
      description: t("toast.generatingDescription"),
    });
  };

  const handleDateRangeChange = (
    _dateString: string[],
    dates: dayjs.Dayjs[],
  ) => {
    setDateRange(dates); // 保存选中的日期范围
    if (dates) {
      postMessage("dateChange", {
        startDate: dates[0],
        endDate: dates[1],
      });
    }
  };

  return (
    <div className="container max-w-5xl p-6 mx-auto">
      <h1 className="mb-8 text-3xl font-bold">{t("title")}</h1>

      <div className="space-y-6">
        <div className="p-6 border rounded-lg bg-card">
          <h2 className="mb-4 text-xl font-semibold">{t("selectDateRange")}</h2>
          <RangePicker
            style={{
              width: "100%",
              backgroundColor: "var(--color-background)",
              color: "var(--color-foreground)",
              borderColor: "var(--color-border)",
            }}
            onChange={handleDateRangeChange}
            showTime={false}
            format="YYYY-MM-DD"
            shortcutsPlacementLeft
            shortcuts={[
              {
                text: t("shortcuts.thisWeek"),
                value: () => [
                  dayjs().startOf("week").add(1, "day"), // 周一
                  dayjs().endOf("week").add(1, "day"), // 周日
                ],
              },
              {
                text: t("shortcuts.lastWeek"),
                value: () => [
                  dayjs().subtract(1, "week").startOf("week").add(1, "day"),
                  dayjs().subtract(1, "week").endOf("week").add(1, "day"),
                ],
              },
              {
                text: t("shortcuts.lastTwoWeeks"),
                value: () => [
                  dayjs().subtract(2, "week").startOf("week").add(1, "day"),
                  dayjs().subtract(1, "week").endOf("week").add(1, "day"),
                ],
              },
            ]}
          />
        </div>

        <div className="p-6 border rounded-lg bg-card">
          <h2 className="mb-4 text-xl font-semibold">
            {t("selectTeamMembers")}
          </h2>
          <ArcoSelect
            mode="multiple"
            placeholder={t("selectTeamMembersPlaceholder")}
            style={{
              width: "100%",
              backgroundColor: "var(--color-background)",
              color: "var(--color-foreground)",
              borderColor: "var(--color-border)",
            }}
            value={selectedUsers}
            onChange={setSelectedUsers}
            allowClear
            tokenSeparators={[",", " ", "|"]}
          >
            {allUsers.map((user) => (
              <ArcoSelect.Option key={user} value={user}>
                {user}
              </ArcoSelect.Option>
            ))}
          </ArcoSelect>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("teamMembersDescription")}
          </p>
        </div>

        <div className="p-6 border rounded-lg bg-card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">{t("reportContent")}</h2>
            <div className="flex gap-2">
              <Button onClick={handleGenerate} size="sm" variant="default">
                <Wand2 className="w-4 h-4 mr-2" />
                {t("generate")}
              </Button>
              <Button onClick={handleSave} size="sm">
                <Save className="w-4 h-4 mr-2" />
                {t("save")}
              </Button>
              <Button onClick={handleExport} size="sm" variant="outline">
                <FileDown className="w-4 h-4 mr-2" />
                {t("export")}
              </Button>
            </div>
          </div>
          <Editor content={content} onChange={setContent} />
        </div>
      </div>
    </div>
  );
}

export default WeeklyReportPage;

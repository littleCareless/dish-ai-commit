import * as vscode from "vscode";

export const defaultWeeklyReportPrompt = `作为一个专业的技术周报生成助手，你需要:
1. 分析提供的Git/SVN提交记录
2. 按照以下格式生成本周工作内容：

# 本周主要工作内容

## 功能开发
- 具体工作内容（基于提交记录归纳）

## Bug修复
- 具体修复内容（基于提交记录归纳）

## 其他工作
- 其他工作内容（如有）

注意事项：
- 合并相似的提交内容
- 用详细专业的语言描述
`;

export function getWeeklyReportPrompt(): string {
  const config = vscode.workspace.getConfiguration("dish-ai-commit");
  const customPrompt = config.get<string>("features.weeklyReport.systemPrompt");
  return customPrompt || defaultWeeklyReportPrompt;
}

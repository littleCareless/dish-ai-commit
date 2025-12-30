import { CustomModelInfo } from "@/types/model-custom";
import { Button } from "@/components/ui/button";
import { Trash2, Edit } from "lucide-react";
import { themeStyles } from "@/utils/theme";

interface ModelListProps {
  models: CustomModelInfo[];
  onEdit: (model: CustomModelInfo) => void;
  onDelete: (providerId: string, modelId: string) => Promise<void>;
  isLoading: boolean;
}

export function ModelList({
  models,
  onEdit,
  onDelete,
  isLoading,
}: ModelListProps) {
  if (isLoading) {
    return (
      <div
        className="text-center py-8"
        style={{ color: themeStyles.mutedForeground() }}
      >
        加载中...
      </div>
    );
  }

  if (models.length === 0) {
    return (
      <div
        className="text-center py-12 border rounded-lg"
        style={{
          backgroundColor: themeStyles.background(0.5),
          borderColor: themeStyles.border(),
        }}
      >
        <p className="text-lg font-medium mb-2">暂无自定义模型</p>
        <p className="text-sm" style={{ color: themeStyles.mutedForeground() }}>
          点击上方"添加模型"按钮开始
        </p>
      </div>
    );
  }

  return (
    <div
      className="border rounded-lg overflow-hidden"
      style={{ borderColor: themeStyles.border() }}
    >
      <table className="w-full text-sm">
        <thead
          style={{
            backgroundColor: themeStyles.muted(),
          }}
        >
          <tr>
            <th className="px-4 py-3 text-left">提供商</th>
            <th className="px-4 py-3 text-left">模型ID</th>
            <th className="px-4 py-3 text-left">名称</th>
            <th className="px-4 py-3 text-left">输入Token</th>
            <th className="px-4 py-3 text-left">输出Token</th>
            <th className="px-4 py-3 text-right">操作</th>
          </tr>
        </thead>
        <tbody>
          {models.map((model) => (
            <tr
              key={`${model.providerId}_${model.id}`}
              className="border-t"
              style={{ borderColor: themeStyles.border() }}
            >
              <td className="px-4 py-3">{model.providerId}</td>
              <td className="px-4 py-3 font-mono text-xs">{model.id}</td>
              <td className="px-4 py-3">{model.modelName}</td>
              <td className="px-4 py-3">{model.maxTokens.input}</td>
              <td className="px-4 py-3">{model.maxTokens.output}</td>
              <td className="px-4 py-3 text-right space-x-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onEdit(model)}
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => onDelete(model.providerId, model.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

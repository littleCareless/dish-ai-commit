import React, { useState, useEffect, useCallback } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  CheckCircle,
  Circle,
  ArrowRight,
  ArrowLeft,
  Info,
} from "lucide-react";

/**
 * 操作步骤接口
 */
interface OperationStep {
  id: string;
  title: string;
  description: string;
  instructions: string[];
  tips?: string[];
  warnings?: string[];
  expectedResult?: string;
  validation?: {
    type: "manual" | "automatic";
    criteria: string;
  };
  media?: {
    type: "image" | "video" | "gif";
    url: string;
    alt: string;
  };
}

/**
 * 操作指导接口
 */
interface OperationGuide {
  id: string;
  title: string;
  description: string;
  estimatedTime: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  prerequisites: string[];
  steps: OperationStep[];
  relatedGuides: string[];
}

/**
 * 操作进度接口
 */
interface OperationProgress {
  currentStep: number;
  completedSteps: number[];
  startedAt: Date;
  completedAt?: Date;
  timeSpent: number;
  notes: string[];
}

/**
 * 操作指导组件
 * 提供分步操作指导和进度跟踪
 */
export const OperationGuide: React.FC<{ guideId?: string }> = ({ guideId }) => {
  const [currentGuide, setCurrentGuide] = useState<OperationGuide | null>(null);
  const [progress, setProgress] = useState<OperationProgress>({
    currentStep: 0,
    completedSteps: [],
    startedAt: new Date(),
    timeSpent: 0,
    notes: [],
  });
  const [isPlaying, setIsPlaying] = useState(false);
  const [showTips, setShowTips] = useState(false);
  const [userNotes, setUserNotes] = useState("");
  const [availableGuides, setAvailableGuides] = useState<OperationGuide[]>([]);

  // 初始化操作指导
  useEffect(() => {
    initializeGuides();
    if (guideId) {
      loadGuide(guideId);
    }
  }, [guideId]);

  // 计时器
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isPlaying && !progress.completedAt) {
      interval = setInterval(() => {
        setProgress((prev) => ({
          ...prev,
          timeSpent: Date.now() - prev.startedAt.getTime(),
        }));
      }, 1000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isPlaying, progress.completedAt, progress.startedAt]);

  /**
   * 初始化操作指导数据
   */
  const initializeGuides = useCallback(() => {
    const guides: OperationGuide[] = [
      {
        id: "setup-api-key",
        title: "配置API密钥",
        description: "学习如何配置各种AI提供商的API密钥",
        estimatedTime: "5-10分钟",
        difficulty: "beginner",
        prerequisites: ["VS Code已安装", "Dish AI Commit Gen扩展已安装"],
        steps: [
          {
            id: "step-1",
            title: "打开设置",
            description: "打开VS Code设置页面",
            instructions: [
              "点击VS Code左下角的齿轮图标",
              '选择"设置"选项',
              "或者使用快捷键 Ctrl+, (Windows/Linux) 或 Cmd+, (Mac)",
            ],
            tips: ['您也可以使用命令面板 (Ctrl+Shift+P) 搜索"设置"'],
            expectedResult: "设置页面应该打开并显示配置选项",
          },
          {
            id: "step-2",
            title: "找到扩展设置",
            description: "定位到Dish AI Commit Gen的配置选项",
            instructions: [
              '在设置搜索框中输入"Dish AI"',
              '找到"Dish AI Commit Gen"扩展设置',
              "展开配置选项",
            ],
            tips: ['您也可以直接在设置中搜索"dish-ai-commit-gen"'],
            expectedResult: "看到Dish AI Commit Gen的所有配置选项",
          },
          {
            id: "step-3",
            title: "配置API密钥",
            description: "输入您的AI提供商API密钥",
            instructions: [
              '找到"API Key"配置项',
              '点击"编辑"按钮',
              "输入您的API密钥",
              '点击"保存"',
            ],
            tips: [
              "确保API密钥格式正确",
              "不要与他人分享您的API密钥",
              '如果使用OpenAI，密钥通常以"sk-"开头',
            ],
            warnings: ["API密钥是敏感信息，请妥善保管"],
            expectedResult: "API密钥已保存并显示为已配置状态",
          },
          {
            id: "step-4",
            title: "验证配置",
            description: "测试API密钥是否有效",
            instructions: [
              '在设置页面点击"测试连接"按钮',
              "等待验证结果",
              "如果成功，您会看到绿色成功提示",
            ],
            tips: ["如果验证失败，请检查API密钥是否正确"],
            expectedResult: '看到"连接成功"的提示信息',
          },
        ],
        relatedGuides: ["select-ai-model", "configure-commit-settings"],
      },
      {
        id: "generate-first-commit",
        title: "生成第一个提交信息",
        description: "学习如何使用AI生成您的第一个提交信息",
        estimatedTime: "3-5分钟",
        difficulty: "beginner",
        prerequisites: ["API密钥已配置", "Git仓库已初始化"],
        steps: [
          {
            id: "step-1",
            title: "准备代码更改",
            description: "确保您有未提交的代码更改",
            instructions: [
              "在VS Code中打开您的项目",
              "进行一些代码修改",
              "保存所有更改",
            ],
            tips: ["您可以使用Git面板查看更改的文件"],
            expectedResult: "在源代码管理面板中看到修改的文件",
          },
          {
            id: "step-2",
            title: "打开源代码管理",
            description: "访问Git源代码管理面板",
            instructions: [
              "点击VS Code左侧活动栏的源代码管理图标",
              "或者使用快捷键 Ctrl+Shift+G",
            ],
            expectedResult: "源代码管理面板打开，显示更改的文件",
          },
          {
            id: "step-3",
            title: "暂存更改",
            description: "将更改添加到暂存区",
            instructions: [
              '在源代码管理面板中，点击文件旁边的"+"按钮',
              '或者右键点击文件选择"暂存更改"',
              "确认文件已添加到暂存区",
            ],
            tips: ['暂存的文件会显示在"已暂存的更改"部分'],
            expectedResult: '文件移动到"已暂存的更改"区域',
          },
          {
            id: "step-4",
            title: "生成提交信息",
            description: "使用AI生成提交信息",
            instructions: [
              '在提交信息输入框中，点击"AI生成"按钮',
              "等待AI分析您的更改",
              "查看生成的提交信息",
            ],
            tips: [
              "AI会分析您的代码更改并生成合适的提交信息",
              "您可以编辑生成的提交信息",
            ],
            expectedResult: "提交信息输入框中显示AI生成的提交信息",
          },
          {
            id: "step-5",
            title: "提交更改",
            description: "完成提交操作",
            instructions: [
              "检查生成的提交信息",
              "如果需要，可以编辑提交信息",
              '点击"提交"按钮或使用快捷键 Ctrl+Enter',
            ],
            tips: ["提交后，更改会保存到Git历史中"],
            expectedResult: "提交成功，暂存区清空",
          },
        ],
        relatedGuides: ["customize-commit-format", "review-commit-history"],
      },
    ];

    setAvailableGuides(guides);
  }, []);

  /**
   * 加载指定指导
   */
  const loadGuide = useCallback(
    (id: string) => {
      const guide = availableGuides.find((g) => g.id === id);
      if (guide) {
        setCurrentGuide(guide);
        setProgress({
          currentStep: 0,
          completedSteps: [],
          startedAt: new Date(),
          timeSpent: 0,
          notes: [],
        });
      }
    },
    [availableGuides],
  );

  /**
   * 开始/暂停指导
   */
  const togglePlayPause = useCallback(() => {
    setIsPlaying((prev) => !prev);
  }, []);

  /**
   * 重置指导
   */
  const resetGuide = useCallback(() => {
    setProgress({
      currentStep: 0,
      completedSteps: [],
      startedAt: new Date(),
      timeSpent: 0,
      notes: [],
    });
    setIsPlaying(false);
  }, []);

  /**
   * 下一步
   */
  const nextStep = useCallback(() => {
    if (currentGuide && progress.currentStep < currentGuide.steps.length - 1) {
      setProgress((prev) => ({
        ...prev,
        currentStep: prev.currentStep + 1,
      }));
    }
  }, [currentGuide, progress.currentStep]);

  /**
   * 上一步
   */
  const previousStep = useCallback(() => {
    if (progress.currentStep > 0) {
      setProgress((prev) => ({
        ...prev,
        currentStep: prev.currentStep - 1,
      }));
    }
  }, [progress.currentStep]);

  /**
   * 标记步骤完成
   */
  const markStepCompleted = useCallback((stepIndex: number) => {
    setProgress((prev) => ({
      ...prev,
      completedSteps: [...new Set([...prev.completedSteps, stepIndex])],
    }));
  }, []);

  /**
   * 添加笔记
   */
  const addNote = useCallback(() => {
    if (userNotes.trim()) {
      setProgress((prev) => ({
        ...prev,
        notes: [...prev.notes, userNotes.trim()],
      }));
      setUserNotes("");
    }
  }, [userNotes]);

  /**
   * 格式化时间
   */
  const formatTime = useCallback((milliseconds: number) => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  }, []);

  /**
   * 获取难度样式
   */
  const getDifficultyStyle = useCallback((difficulty: string) => {
    switch (difficulty) {
      case "beginner":
        return "bg-green-100 text-green-800";
      case "intermediate":
        return "bg-yellow-100 text-yellow-800";
      case "advanced":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  }, []);

  if (!currentGuide) {
    return (
      <div className="operation-guide h-full flex items-center justify-center">
        <div className="text-center">
          <Info className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            选择操作指导
          </h3>
          <p className="text-gray-600 mb-4">请选择一个操作指导开始学习</p>
          <div className="space-y-2">
            {availableGuides.map((guide) => (
              <button
                key={guide.id}
                onClick={() => loadGuide(guide.id)}
                className="block w-full p-3 text-left border border-gray-200 rounded-lg hover:border-gray-300 hover:bg-gray-50"
              >
                <h4 className="font-medium text-gray-900">{guide.title}</h4>
                <p className="text-sm text-gray-600">{guide.description}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span
                    className={`px-2 py-1 text-xs rounded ${getDifficultyStyle(guide.difficulty)}`}
                  >
                    {guide.difficulty}
                  </span>
                  <span className="text-xs text-gray-500">
                    {guide.estimatedTime}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const currentStep = currentGuide.steps[progress.currentStep];
  const isLastStep = progress.currentStep === currentGuide.steps.length - 1;
  const isFirstStep = progress.currentStep === 0;
  const isStepCompleted = progress.completedSteps.includes(
    progress.currentStep,
  );

  return (
    <div className="operation-guide h-full flex flex-col bg-white">
      {/* 头部 */}
      <div className="guide-header p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">
              {currentGuide.title}
            </h1>
            <p className="text-sm text-gray-600">{currentGuide.description}</p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`px-2 py-1 text-xs rounded ${getDifficultyStyle(currentGuide.difficulty)}`}
            >
              {currentGuide.difficulty}
            </span>
            <span className="text-sm text-gray-500">
              {currentGuide.estimatedTime}
            </span>
          </div>
        </div>

        {/* 进度条 */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
            <span>
              进度: {progress.currentStep + 1} / {currentGuide.steps.length}
            </span>
            <span>时间: {formatTime(progress.timeSpent)}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{
                width: `${((progress.currentStep + 1) / currentGuide.steps.length) * 100}%`,
              }}
            />
          </div>
        </div>

        {/* 控制按钮 */}
        <div className="flex items-center gap-2">
          <button
            onClick={togglePlayPause}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            {isPlaying ? (
              <Pause className="w-4 h-4" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            {isPlaying ? "暂停" : "开始"}
          </button>
          <button
            onClick={resetGuide}
            className="flex items-center gap-2 px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            重置
          </button>
          <button
            onClick={() => setShowTips(!showTips)}
            className="flex items-center gap-2 px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Info className="w-4 h-4" />
            {showTips ? "隐藏" : "显示"}提示
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* 步骤列表 */}
        <div className="w-1/3 border-r border-gray-200 overflow-y-auto">
          <div className="p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">步骤列表</h3>
            <div className="space-y-2">
              {currentGuide.steps.map((step, index) => (
                <div
                  key={step.id}
                  onClick={() =>
                    setProgress((prev) => ({ ...prev, currentStep: index }))
                  }
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    index === progress.currentStep
                      ? "border-blue-500 bg-blue-50"
                      : progress.completedSteps.includes(index)
                        ? "border-green-500 bg-green-50"
                        : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-1">
                      {progress.completedSteps.includes(index) ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : (
                        <Circle className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-gray-900">
                        {step.title}
                      </h4>
                      <p className="text-xs text-gray-600 mt-1">
                        {step.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 主内容区域 */}
        <div className="flex-1 overflow-y-auto">
          {currentStep && (
            <div className="p-6">
              <div className="max-w-4xl">
                {/* 当前步骤头部 */}
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm text-gray-600">
                      步骤 {progress.currentStep + 1}
                    </span>
                    {isStepCompleted && (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    )}
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    {currentStep.title}
                  </h2>
                  <p className="text-gray-600">{currentStep.description}</p>
                </div>

                {/* 操作说明 */}
                <div className="mb-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-3">
                    操作步骤
                  </h3>
                  <div className="space-y-3">
                    {currentStep.instructions.map((instruction, index) => (
                      <div key={index} className="flex items-start gap-3">
                        <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-sm font-medium">
                          {index + 1}
                        </span>
                        <p className="text-gray-700">{instruction}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 提示信息 */}
                {showTips &&
                  currentStep.tips &&
                  currentStep.tips.length > 0 && (
                    <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <h4 className="text-sm font-medium text-blue-900 mb-2">
                        💡 提示
                      </h4>
                      <ul className="space-y-1">
                        {currentStep.tips.map((tip, index) => (
                          <li key={index} className="text-sm text-blue-800">
                            • {tip}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                {/* 警告信息 */}
                {currentStep.warnings && currentStep.warnings.length > 0 && (
                  <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <h4 className="text-sm font-medium text-yellow-900 mb-2">
                      ⚠️ 警告
                    </h4>
                    <ul className="space-y-1">
                      {currentStep.warnings.map((warning, index) => (
                        <li key={index} className="text-sm text-yellow-800">
                          • {warning}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* 预期结果 */}
                {currentStep.expectedResult && (
                  <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <h4 className="text-sm font-medium text-green-900 mb-2">
                      ✅ 预期结果
                    </h4>
                    <p className="text-sm text-green-800">
                      {currentStep.expectedResult}
                    </p>
                  </div>
                )}

                {/* 导航按钮 */}
                <div className="flex items-center justify-between">
                  <button
                    onClick={previousStep}
                    disabled={isFirstStep}
                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    上一步
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => markStepCompleted(progress.currentStep)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                        isStepCompleted
                          ? "bg-green-600 text-white hover:bg-green-700"
                          : "border border-gray-300 text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      <CheckCircle className="w-4 h-4" />
                      {isStepCompleted ? "已完成" : "标记完成"}
                    </button>
                  </div>

                  <button
                    onClick={nextStep}
                    disabled={isLastStep}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    下一步
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>

                {/* 笔记区域 */}
                <div className="mt-8 border-t border-gray-200 pt-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-3">
                    学习笔记
                  </h3>
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={userNotes}
                        onChange={(e) => setUserNotes(e.target.value)}
                        placeholder="添加学习笔记..."
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        onKeyPress={(e) => e.key === "Enter" && addNote()}
                      />
                      <button
                        onClick={addNote}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        添加
                      </button>
                    </div>
                    {progress.notes.length > 0 && (
                      <div className="space-y-2">
                        {progress.notes.map((note, index) => (
                          <div
                            key={index}
                            className="p-3 bg-gray-50 rounded-lg"
                          >
                            <p className="text-sm text-gray-700">{note}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect, useCallback } from 'react';
import { CheckCircle, ArrowRight, ArrowLeft, X, Lightbulb, Settings } from 'lucide-react';

/**
 * 引导步骤接口
 */
interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  content: string;
  type: 'info' | 'interactive' | 'demo' | 'configuration';
  icon: string;
  estimatedTime: string;
  required: boolean;
  skipable: boolean;
  actions?: OnboardingAction[];
  validation?: {
    type: 'manual' | 'automatic';
    criteria: string;
  };
}

/**
 * 引导操作接口
 */
interface OnboardingAction {
  id: string;
  label: string;
  type: 'button' | 'link' | 'input';
  action: string;
  validation?: string;
}

/**
 * 引导进度接口
 */
interface OnboardingProgress {
  currentStep: number;
  completedSteps: string[];
  skippedSteps: string[];
  startedAt: Date;
  completedAt?: Date;
  timeSpent: number;
  userPreferences: Record<string, any>;
}

/**
 * 新用户引导组件
 * 提供交互式的新用户引导体验
 */
export const OnboardingGuide: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState<OnboardingProgress>({
    currentStep: 0,
    completedSteps: [],
    skippedSteps: [],
    startedAt: new Date(),
    timeSpent: 0,
    userPreferences: {}
  });
  const [isVisible, setIsVisible] = useState(true);
  const [userInput, setUserInput] = useState<Record<string, any>>({});
  const [steps, setSteps] = useState<OnboardingStep[]>([]);

  // 初始化引导步骤
  useEffect(() => {
    initializeOnboardingSteps();
    loadProgress();
  }, []);

  // 计时器
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => ({
        ...prev,
        timeSpent: Date.now() - prev.startedAt.getTime()
      }));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  /**
   * 初始化引导步骤
   */
  const initializeOnboardingSteps = useCallback(() => {
    const onboardingSteps: OnboardingStep[] = [
      {
        id: 'welcome',
        title: '欢迎使用 Dish AI Commit Gen',
        description: '让我们快速了解这个强大的AI提交信息生成工具',
        content: `Dish AI Commit Gen 是一个智能的VS Code扩展，可以帮助您：

🎯 **自动生成提交信息** - 基于代码更改智能生成清晰的提交信息
🤖 **多种AI模型支持** - 支持OpenAI、Anthropic、Ollama等主流AI提供商
⚡ **快速集成** - 几分钟内完成配置，立即开始使用
🔧 **高度可定制** - 根据您的需求调整生成策略和格式

让我们开始配置您的AI助手！`,
        type: 'info',
        icon: '👋',
        estimatedTime: '1分钟',
        required: true,
        skipable: false
      },
      {
        id: 'api-setup',
        title: '配置AI提供商',
        description: '选择并配置您的AI提供商',
        content: `首先，您需要配置一个AI提供商来生成提交信息。

**支持的提供商：**
- OpenAI (GPT-3.5, GPT-4)
- Anthropic (Claude)
- Ollama (本地模型)
- 其他兼容OpenAI API的提供商

**配置步骤：**
1. 获取API密钥
2. 在设置中配置
3. 测试连接

您想使用哪个提供商？`,
        type: 'interactive',
        icon: '🔑',
        estimatedTime: '3-5分钟',
        required: true,
        skipable: false,
        actions: [
          {
            id: 'select-openai',
            label: 'OpenAI',
            type: 'button',
            action: 'configure_openai'
          },
          {
            id: 'select-anthropic',
            label: 'Anthropic',
            type: 'button',
            action: 'configure_anthropic'
          },
          {
            id: 'select-ollama',
            label: 'Ollama (本地)',
            type: 'button',
            action: 'configure_ollama'
          },
          {
            id: 'skip-for-now',
            label: '稍后配置',
            type: 'button',
            action: 'skip_configuration'
          }
        ]
      },
      {
        id: 'model-selection',
        title: '选择AI模型',
        description: '根据您的需求选择合适的模型',
        content: `不同的AI模型有不同的特点和性能：

**GPT-4** - 最强大的模型，生成质量最高，但速度较慢
**GPT-3.5** - 平衡性能和速度，适合日常使用
**Claude** - 优秀的代码理解能力
**本地模型** - 隐私保护，但需要本地资源

**建议：**
- 新手用户：GPT-3.5
- 专业用户：GPT-4
- 隐私敏感：本地模型`,
        type: 'info',
        icon: '🧠',
        estimatedTime: '2分钟',
        required: false,
        skipable: true
      },
      {
        id: 'first-commit',
        title: '生成第一个提交信息',
        description: '让我们尝试生成您的第一个AI提交信息',
        content: `现在让我们尝试生成您的第一个AI提交信息！

**操作步骤：**
1. 确保您在一个Git仓库中
2. 进行一些代码更改
3. 暂存更改
4. 使用扩展生成提交信息

**提示：**
- 确保代码更改已保存
- 在源代码管理面板中暂存更改
- 点击"AI生成"按钮

准备好了吗？`,
        type: 'demo',
        icon: '🚀',
        estimatedTime: '3分钟',
        required: true,
        skipable: true,
        actions: [
          {
            id: 'start-demo',
            label: '开始演示',
            type: 'button',
            action: 'start_demo'
          },
          {
            id: 'skip-demo',
            label: '跳过演示',
            type: 'button',
            action: 'skip_demo'
          }
        ]
      },
      {
        id: 'customization',
        title: '个性化设置',
        description: '根据您的偏好调整设置',
        content: `让我们根据您的需求调整一些设置：

**提交信息格式：**
- 传统格式 (feat: add new feature)
- 简洁格式 (Add new feature)
- 详细格式 (包含更多上下文)

**生成策略：**
- 自动模式 (自动生成)
- 建议模式 (提供多个选项)
- 交互模式 (逐步引导)

**语言偏好：**
- 中文
- 英文
- 自动检测`,
        type: 'configuration',
        icon: '⚙️',
        estimatedTime: '2分钟',
        required: false,
        skipable: true,
        actions: [
          {
            id: 'format-traditional',
            label: '传统格式',
            type: 'button',
            action: 'set_format_traditional'
          },
          {
            id: 'format-simple',
            label: '简洁格式',
            type: 'button',
            action: 'set_format_simple'
          },
          {
            id: 'language-chinese',
            label: '中文',
            type: 'button',
            action: 'set_language_chinese'
          },
          {
            id: 'language-english',
            label: '英文',
            type: 'button',
            action: 'set_language_english'
          }
        ]
      },
      {
        id: 'completion',
        title: '完成设置',
        description: '恭喜！您已经完成了基本配置',
        content: `🎉 **恭喜！** 您已经完成了Dish AI Commit Gen的基本配置。

**您现在可以：**
✅ 使用AI生成提交信息
✅ 自定义生成策略
✅ 享受智能代码分析

**下一步建议：**
- 尝试生成不同类型的提交信息
- 探索高级设置选项
- 查看帮助文档了解更多功能

**需要帮助？**
- 点击帮助按钮查看文档
- 使用命令面板搜索功能
- 访问我们的支持页面

感谢您选择Dish AI Commit Gen！`,
        type: 'info',
        icon: '🎉',
        estimatedTime: '1分钟',
        required: true,
        skipable: false
      }
    ];

    setSteps(onboardingSteps);
  }, []);

  /**
   * 加载进度
   */
  const loadProgress = useCallback(() => {
    const savedProgress = localStorage.getItem('onboarding-progress');
    if (savedProgress) {
      try {
        const parsed = JSON.parse(savedProgress);
        setProgress(prev => ({
          ...prev,
          ...parsed,
          startedAt: new Date(parsed.startedAt)
        }));
      } catch (error) {
        console.error('Failed to load onboarding progress:', error);
      }
    }
  }, []);

  /**
   * 保存进度
   */
  const saveProgress = useCallback(() => {
    localStorage.setItem('onboarding-progress', JSON.stringify(progress));
  }, [progress]);

  /**
   * 下一步
   */
  const nextStep = useCallback(() => {
    if (currentStep < steps.length - 1) {
      const newStep = currentStep + 1;
      setCurrentStep(newStep);
      setProgress(prev => ({
        ...prev,
        currentStep: newStep
      }));
    } else {
      completeOnboarding();
    }
    saveProgress();
  }, [currentStep, steps.length, saveProgress]);

  /**
   * 上一步
   */
  const previousStep = useCallback(() => {
    if (currentStep > 0) {
      const newStep = currentStep - 1;
      setCurrentStep(newStep);
      setProgress(prev => ({
        ...prev,
        currentStep: newStep
      }));
      saveProgress();
    }
  }, [currentStep, saveProgress]);

  /**
   * 跳过当前步骤
   */
  const skipStep = useCallback(() => {
    const currentStepData = steps[currentStep];
    if (currentStepData && currentStepData.skipable) {
      setProgress(prev => ({
        ...prev,
        skippedSteps: [...prev.skippedSteps, currentStepData.id]
      }));
      nextStep();
    }
  }, [currentStep, steps, nextStep]);

  /**
   * 完成引导
   */
  const completeOnboarding = useCallback(() => {
    setProgress(prev => ({
      ...prev,
      completedAt: new Date()
    }));
    setIsVisible(false);
    localStorage.setItem('onboarding-completed', 'true');
    localStorage.removeItem('onboarding-progress');
  }, []);

  /**
   * 处理操作
   */
  const handleAction = useCallback((action: OnboardingAction) => {
    const { id, action: actionType } = action;
    
    // 记录用户选择
    setUserInput(prev => ({
      ...prev,
      [id]: true
    }));

    // 根据操作类型执行相应逻辑
    switch (actionType) {
      case 'configure_openai':
        setProgress(prev => ({
          ...prev,
          userPreferences: {
            ...prev.userPreferences,
            provider: 'openai'
          }
        }));
        break;
      case 'configure_anthropic':
        setProgress(prev => ({
          ...prev,
          userPreferences: {
            ...prev.userPreferences,
            provider: 'anthropic'
          }
        }));
        break;
      case 'configure_ollama':
        setProgress(prev => ({
          ...prev,
          userPreferences: {
            ...prev.userPreferences,
            provider: 'ollama'
          }
        }));
        break;
      case 'set_format_traditional':
        setProgress(prev => ({
          ...prev,
          userPreferences: {
            ...prev.userPreferences,
            format: 'traditional'
          }
        }));
        break;
      case 'set_format_simple':
        setProgress(prev => ({
          ...prev,
          userPreferences: {
            ...prev.userPreferences,
            format: 'simple'
          }
        }));
        break;
      case 'set_language_chinese':
        setProgress(prev => ({
          ...prev,
          userPreferences: {
            ...prev.userPreferences,
            language: 'chinese'
          }
        }));
        break;
      case 'set_language_english':
        setProgress(prev => ({
          ...prev,
          userPreferences: {
            ...prev.userPreferences,
            language: 'english'
          }
        }));
        break;
    }

    // 某些操作后自动进入下一步
    if (['configure_openai', 'configure_anthropic', 'configure_ollama'].includes(actionType)) {
      setTimeout(nextStep, 1000);
    }
  }, [nextStep]);

  /**
   * 关闭引导
   */
  const closeOnboarding = useCallback(() => {
    setIsVisible(false);
    localStorage.setItem('onboarding-skipped', 'true');
  }, []);

  /**
   * 格式化时间
   */
  const formatTime = useCallback((milliseconds: number) => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }, []);

  if (!isVisible || steps.length === 0) {
    return null;
  }

  const currentStepData = steps[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === steps.length - 1;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* 头部 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{currentStepData.icon}</span>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{currentStepData.title}</h2>
              <p className="text-sm text-gray-600">{currentStepData.description}</p>
            </div>
          </div>
          <button
            onClick={closeOnboarding}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* 进度条 */}
        <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
            <span>步骤 {currentStep + 1} / {steps.length}</span>
            <span>时间: {formatTime(progress.timeSpent)}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            />
          </div>
        </div>

        {/* 内容区域 */}
        <div className="p-6 overflow-y-auto max-h-96">
          <div className="prose prose-sm max-w-none">
            <div className="whitespace-pre-line text-gray-700 leading-relaxed">
              {currentStepData.content}
            </div>
          </div>

          {/* 操作按钮 */}
          {currentStepData.actions && currentStepData.actions.length > 0 && (
            <div className="mt-6 space-y-3">
              {currentStepData.actions.map(action => (
                <button
                  key={action.id}
                  onClick={() => handleAction(action)}
                  className={`w-full p-3 rounded-lg border transition-colors ${
                    userInput[action.id]
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{action.label}</span>
                    {userInput[action.id] && <CheckCircle className="w-5 h-5 text-blue-600" />}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* 特殊内容 */}
          {currentStepData.type === 'demo' && (
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Lightbulb className="w-5 h-5 text-blue-600" />
                <h4 className="font-medium text-blue-900">演示提示</h4>
              </div>
              <p className="text-sm text-blue-800">
                请按照以下步骤操作：打开源代码管理面板 → 暂存更改 → 点击AI生成按钮
              </p>
            </div>
          )}

          {currentStepData.type === 'configuration' && (
            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Settings className="w-5 h-5 text-green-600" />
                <h4 className="font-medium text-green-900">配置提示</h4>
              </div>
              <p className="text-sm text-green-800">
                您的选择将保存到扩展设置中，您可以随时在设置中修改这些选项。
              </p>
            </div>
          )}
        </div>

        {/* 底部导航 */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center gap-2">
            {currentStepData.skipable && (
              <button
                onClick={skipStep}
                className="text-sm text-gray-600 hover:text-gray-800 transition-colors"
              >
                跳过此步骤
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={previousStep}
              disabled={isFirstStep}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ArrowLeft className="w-4 h-4" />
              上一步
            </button>

            <button
              onClick={nextStep}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {isLastStep ? '完成' : '下一步'}
              {!isLastStep && <ArrowRight className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* 步骤指示器 */}
        <div className="px-6 py-3 bg-gray-100 border-t border-gray-200">
          <div className="flex items-center justify-center gap-2">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index === currentStep
                    ? 'bg-blue-600'
                    : index < currentStep
                    ? 'bg-green-500'
                    : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

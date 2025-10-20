import React, { useState, useEffect, useCallback } from 'react';
import { Search, AlertTriangle, CheckCircle, XCircle, RefreshCw, Lightbulb, ExternalLink } from 'lucide-react';

/**
 * 故障排除步骤接口
 */
interface TroubleshootingStep {
  id: string;
  title: string;
  description: string;
  type: 'question' | 'action' | 'result' | 'solution';
  options?: TroubleshootingOption[];
  action?: string;
  validation?: string;
  result?: 'success' | 'failure' | 'partial';
  solution?: string;
  nextSteps?: string[];
}

/**
 * 故障排除选项接口
 */
interface TroubleshootingOption {
  id: string;
  label: string;
  description?: string;
  nextStepId: string;
  weight: number;
}

/**
 * 故障排除会话接口
 */
interface TroubleshootingSession {
  id: string;
  startedAt: Date;
  currentStep: string;
  path: string[];
  answers: Record<string, any>;
  results: Record<string, any>;
  completed: boolean;
}

/**
 * 故障排除向导组件
 * 提供交互式故障排除流程
 */
export const TroubleshootingWizard: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<string>('start');
  const [session, setSession] = useState<TroubleshootingSession>({
    id: `session_${Date.now()}`,
    startedAt: new Date(),
    currentStep: 'start',
    path: ['start'],
    answers: {},
    results: {},
    completed: false
  });
  const [steps, setSteps] = useState<Map<string, TroubleshootingStep>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // 初始化故障排除步骤
  useEffect(() => {
    initializeTroubleshootingSteps();
  }, []);

  /**
   * 初始化故障排除步骤
   */
  const initializeTroubleshootingSteps = useCallback(() => {
    const troubleshootingSteps: TroubleshootingStep[] = [
      {
        id: 'start',
        title: '故障排除向导',
        description: '让我们帮您诊断和解决问题',
        type: 'question',
        options: [
          {
            id: 'api-issue',
            label: 'API连接问题',
            description: '无法连接到AI服务或API调用失败',
            nextStepId: 'api-connection-check',
            weight: 1
          },
          {
            id: 'generation-issue',
            label: '生成质量问题',
            description: '生成的提交信息不符合预期',
            nextStepId: 'generation-quality-check',
            weight: 1
          },
          {
            id: 'configuration-issue',
            label: '配置问题',
            description: '设置或配置相关的问题',
            nextStepId: 'configuration-check',
            weight: 1
          },
          {
            id: 'performance-issue',
            label: '性能问题',
            description: '扩展运行缓慢或占用资源过多',
            nextStepId: 'performance-check',
            weight: 1
          },
          {
            id: 'other-issue',
            label: '其他问题',
            description: '上述类别之外的问题',
            nextStepId: 'general-check',
            weight: 1
          }
        ]
      },
      // API连接问题流程
      {
        id: 'api-connection-check',
        title: 'API连接检查',
        description: '让我们检查您的API连接状态',
        type: 'action',
        action: '检查API连接状态和配置',
        validation: 'API连接是否正常？'
      },
      {
        id: 'api-key-valid',
        title: 'API密钥验证',
        description: 'API连接正常',
        type: 'result',
        result: 'success',
        solution: '您的API连接正常。如果仍有问题，可能是网络或服务提供商的问题。',
        nextSteps: ['检查网络连接', '查看服务提供商状态', '尝试重新生成API密钥']
      },
      {
        id: 'api-key-invalid',
        title: 'API密钥问题',
        description: 'API连接失败',
        type: 'result',
        result: 'failure',
        solution: '您的API密钥可能无效或已过期。',
        nextSteps: ['检查API密钥格式', '重新生成API密钥', '验证API密钥权限']
      },
      // 生成质量问题流程
      {
        id: 'generation-quality-check',
        title: '生成质量检查',
        description: '让我们分析生成质量问题的原因',
        type: 'question',
        options: [
          {
            id: 'quality-poor',
            label: '生成内容质量差',
            description: '生成的提交信息不准确或不相关',
            nextStepId: 'quality-analysis',
            weight: 1
          },
          {
            id: 'quality-format',
            label: '格式不符合预期',
            description: '生成的提交信息格式不正确',
            nextStepId: 'format-analysis',
            weight: 1
          },
          {
            id: 'quality-language',
            label: '语言不符合预期',
            description: '生成的提交信息语言不正确',
            nextStepId: 'language-analysis',
            weight: 1
          }
        ]
      },
      {
        id: 'quality-analysis',
        title: '质量分析',
        description: '生成质量问题的可能原因',
        type: 'solution',
        solution: '生成质量差可能由以下原因造成：\n\n1. 代码更改过于复杂或模糊\n2. AI模型选择不当\n3. 提示词配置需要优化\n4. 上下文信息不足',
        nextSteps: ['简化代码更改', '尝试不同的AI模型', '调整提示词设置', '增加上下文信息']
      },
      {
        id: 'format-analysis',
        title: '格式分析',
        description: '格式问题的解决方案',
        type: 'solution',
        solution: '格式问题通常由以下原因造成：\n\n1. 提交信息格式设置不正确\n2. 自定义模板配置有误\n3. AI模型不理解格式要求',
        nextSteps: ['检查格式设置', '重置为默认格式', '更新自定义模板', '尝试不同的AI模型']
      },
      {
        id: 'language-analysis',
        title: '语言分析',
        description: '语言问题的解决方案',
        type: 'solution',
        solution: '语言问题可能由以下原因造成：\n\n1. 语言设置不正确\n2. AI模型不支持指定语言\n3. 提示词语言配置有误',
        nextSteps: ['检查语言设置', '选择支持多语言的模型', '更新提示词语言', '使用英文作为备选']
      },
      // 配置问题流程
      {
        id: 'configuration-check',
        title: '配置检查',
        description: '让我们检查您的配置设置',
        type: 'action',
        action: '检查扩展配置和设置',
        validation: '配置是否正确？'
      },
      {
        id: 'config-valid',
        title: '配置正常',
        description: '配置检查通过',
        type: 'result',
        result: 'success',
        solution: '您的配置设置正常。如果仍有问题，可能需要检查特定功能的配置。',
        nextSteps: ['检查特定功能设置', '重置为默认配置', '查看配置文档']
      },
      {
        id: 'config-invalid',
        title: '配置问题',
        description: '发现配置问题',
        type: 'result',
        result: 'failure',
        solution: '发现以下配置问题：\n\n1. API密钥未配置或无效\n2. 模型设置不正确\n3. 其他设置存在冲突',
        nextSteps: ['重新配置API密钥', '检查模型设置', '重置配置', '查看配置指南']
      },
      // 性能问题流程
      {
        id: 'performance-check',
        title: '性能检查',
        description: '让我们分析性能问题',
        type: 'question',
        options: [
          {
            id: 'performance-slow',
            label: '响应速度慢',
            description: 'AI生成响应时间过长',
            nextStepId: 'speed-analysis',
            weight: 1
          },
          {
            id: 'performance-memory',
            label: '内存占用高',
            description: '扩展占用过多内存',
            nextStepId: 'memory-analysis',
            weight: 1
          },
          {
            id: 'performance-cpu',
            label: 'CPU使用率高',
            description: '扩展占用过多CPU资源',
            nextStepId: 'cpu-analysis',
            weight: 1
          }
        ]
      },
      {
        id: 'speed-analysis',
        title: '速度分析',
        description: '响应速度慢的解决方案',
        type: 'solution',
        solution: '响应速度慢可能由以下原因造成：\n\n1. 网络连接不稳定\n2. AI模型选择不当\n3. 代码更改过于复杂\n4. 服务器负载过高',
        nextSteps: ['检查网络连接', '选择更快的模型', '简化代码更改', '稍后重试']
      },
      {
        id: 'memory-analysis',
        title: '内存分析',
        description: '内存占用高的解决方案',
        type: 'solution',
        solution: '内存占用高可能由以下原因造成：\n\n1. 大量代码更改\n2. 扩展缓存过多\n3. 系统资源不足',
        nextSteps: ['重启VS Code', '清理扩展缓存', '减少代码更改范围', '检查系统资源']
      },
      {
        id: 'cpu-analysis',
        title: 'CPU分析',
        description: 'CPU使用率高的解决方案',
        type: 'solution',
        solution: 'CPU使用率高可能由以下原因造成：\n\n1. 复杂的代码分析\n2. 频繁的AI调用\n3. 系统资源竞争',
        nextSteps: ['减少AI调用频率', '优化代码分析', '关闭其他应用', '检查系统负载']
      },
      // 通用问题流程
      {
        id: 'general-check',
        title: '通用问题检查',
        description: '让我们进行通用问题诊断',
        type: 'action',
        action: '执行通用诊断检查',
        validation: '是否发现具体问题？'
      },
      {
        id: 'general-solution',
        title: '通用解决方案',
        description: '通用问题解决建议',
        type: 'solution',
        solution: '对于通用问题，建议尝试以下解决方案：\n\n1. 重启VS Code\n2. 重新安装扩展\n3. 检查VS Code版本兼容性\n4. 查看扩展日志\n5. 联系技术支持',
        nextSteps: ['重启VS Code', '重新安装扩展', '查看日志文件', '联系支持团队']
      }
    ];

    const stepsMap = new Map<string, TroubleshootingStep>();
    troubleshootingSteps.forEach(step => {
      stepsMap.set(step.id, step);
    });

    setSteps(stepsMap);
  }, []);

  /**
   * 选择选项
   */
  const selectOption = useCallback((option: TroubleshootingOption) => {
    setSession(prev => ({
      ...prev,
      answers: {
        ...prev.answers,
        [prev.currentStep]: option.id
      },
      path: [...prev.path, option.nextStepId],
      currentStep: option.nextStepId
    }));
    setCurrentStep(option.nextStepId);
  }, []);

  /**
   * 执行操作
   */
  const executeAction = useCallback(async (step: TroubleshootingStep) => {
    setIsLoading(true);
    
    try {
      // 模拟操作执行
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // 根据操作类型决定下一步
      let nextStepId: string;
      if (step.id === 'api-connection-check') {
        // 模拟API连接检查结果
        const isConnected = Math.random() > 0.3; // 70%成功率
        nextStepId = isConnected ? 'api-key-valid' : 'api-key-invalid';
      } else if (step.id === 'configuration-check') {
        // 模拟配置检查结果
        const isConfigValid = Math.random() > 0.4; // 60%成功率
        nextStepId = isConfigValid ? 'config-valid' : 'config-invalid';
      } else if (step.id === 'general-check') {
        nextStepId = 'general-solution';
      } else {
        nextStepId = 'general-solution';
      }

      setSession(prev => ({
        ...prev,
        results: {
          ...prev.results,
          [step.id]: 'completed'
        },
        currentStep: nextStepId,
        path: [...prev.path, nextStepId]
      }));
      setCurrentStep(nextStepId);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * 重新开始
   */
  const restart = useCallback(() => {
    setCurrentStep('start');
    setSession({
      id: `session_${Date.now()}`,
      startedAt: new Date(),
      currentStep: 'start',
      path: ['start'],
      answers: {},
      results: {},
      completed: false
    });
  }, []);

  /**
   * 返回上一步
   */
  const goBack = useCallback(() => {
    if (session.path.length > 1) {
      const newPath = session.path.slice(0, -1);
      const previousStep = newPath[newPath.length - 1];
      
      setSession(prev => ({
        ...prev,
        path: newPath,
        currentStep: previousStep
      }));
      setCurrentStep(previousStep);
    }
  }, [session.path]);

  /**
   * 完成故障排除
   */
  const completeTroubleshooting = useCallback(() => {
    setSession(prev => ({
      ...prev,
      completed: true
    }));
  }, []);

  /**
   * 搜索故障排除内容
   */
  const searchTroubleshooting = useCallback(() => {
    if (!searchQuery.trim()) return;

    // 简单的搜索逻辑
    const matchingSteps = Array.from(steps.values()).filter(step =>
      step.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      step.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (step.solution && step.solution.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    if (matchingSteps.length > 0) {
      // 跳转到第一个匹配的步骤
      const firstMatch = matchingSteps[0];
      setCurrentStep(firstMatch.id);
      setSession(prev => ({
        ...prev,
        currentStep: firstMatch.id,
        path: [...prev.path, firstMatch.id]
      }));
    }
  }, [searchQuery, steps]);

  const currentStepData = steps.get(currentStep);
  if (!currentStepData) {
    return (
      <div className="troubleshooting-wizard h-full flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">故障排除向导</h3>
          <p className="text-gray-600">正在加载故障排除步骤...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="troubleshooting-wizard h-full flex flex-col bg-white">
      {/* 头部 */}
      <div className="wizard-header p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">故障排除向导</h1>
            <p className="text-sm text-gray-600">让我们帮您诊断和解决问题</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={restart}
              className="flex items-center gap-2 px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              重新开始
            </button>
          </div>
        </div>

        {/* 搜索栏 */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="搜索故障排除内容..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && searchTroubleshooting()}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* 内容区域 */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6">
          <div className="max-w-4xl mx-auto">
            {/* 当前步骤 */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm text-gray-600">步骤 {session.path.length}</span>
                {currentStepData.type === 'result' && (
                  <>
                    {currentStepData.result === 'success' && <CheckCircle className="w-5 h-5 text-green-600" />}
                    {currentStepData.result === 'failure' && <XCircle className="w-5 h-5 text-red-600" />}
                  </>
                )}
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{currentStepData.title}</h2>
              <p className="text-gray-600">{currentStepData.description}</p>
            </div>

            {/* 步骤内容 */}
            <div className="mb-6">
              {currentStepData.type === 'question' && currentStepData.options && (
                <div className="space-y-3">
                  {currentStepData.options.map(option => (
                    <button
                      key={option.id}
                      onClick={() => selectOption(option)}
                      className="w-full p-4 text-left border border-gray-200 rounded-lg hover:border-gray-300 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900">{option.label}</h3>
                          {option.description && (
                            <p className="text-sm text-gray-600 mt-1">{option.description}</p>
                          )}
                        </div>
                        <ArrowRight className="w-5 h-5 text-gray-400" />
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {currentStepData.type === 'action' && (
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Lightbulb className="w-5 h-5 text-blue-600" />
                      <h3 className="font-medium text-blue-900">执行操作</h3>
                    </div>
                    <p className="text-blue-800">{currentStepData.action}</p>
                  </div>

                  {currentStepData.validation && (
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <h4 className="font-medium text-yellow-900 mb-2">验证结果</h4>
                      <p className="text-yellow-800">{currentStepData.validation}</p>
                    </div>
                  )}

                  <button
                    onClick={() => executeAction(currentStepData)}
                    disabled={isLoading}
                    className="w-full p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? '执行中...' : '执行检查'}
                  </button>
                </div>
              )}

              {currentStepData.type === 'result' && (
                <div className={`p-4 rounded-lg border ${
                  currentStepData.result === 'success'
                    ? 'bg-green-50 border-green-200'
                    : currentStepData.result === 'failure'
                    ? 'bg-red-50 border-red-200'
                    : 'bg-yellow-50 border-yellow-200'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    {currentStepData.result === 'success' && <CheckCircle className="w-5 h-5 text-green-600" />}
                    {currentStepData.result === 'failure' && <XCircle className="w-5 h-5 text-red-600" />}
                    <h3 className={`font-medium ${
                      currentStepData.result === 'success'
                        ? 'text-green-900'
                        : currentStepData.result === 'failure'
                        ? 'text-red-900'
                        : 'text-yellow-900'
                    }`}>
                      {currentStepData.result === 'success' ? '检查通过' : 
                       currentStepData.result === 'failure' ? '发现问题' : '部分问题'}
                    </h3>
                  </div>
                  <p className={`${
                    currentStepData.result === 'success'
                      ? 'text-green-800'
                      : currentStepData.result === 'failure'
                      ? 'text-red-800'
                      : 'text-yellow-800'
                  }`}>
                    {currentStepData.solution}
                  </p>
                </div>
              )}

              {currentStepData.type === 'solution' && (
                <div className="space-y-4">
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <h3 className="font-medium text-green-900">解决方案</h3>
                    </div>
                    <div className="text-green-800 whitespace-pre-line">
                      {currentStepData.solution}
                    </div>
                  </div>

                  {currentStepData.nextSteps && currentStepData.nextSteps.length > 0 && (
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <h4 className="font-medium text-blue-900 mb-2">建议的下一步</h4>
                      <ul className="space-y-1">
                        {currentStepData.nextSteps.map((step, index) => (
                          <li key={index} className="text-blue-800 flex items-center gap-2">
                            <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                            {step}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 导航按钮 */}
            <div className="flex items-center justify-between">
              <button
                onClick={goBack}
                disabled={session.path.length <= 1}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ArrowLeft className="w-4 h-4" />
                上一步
              </button>

              <div className="flex items-center gap-2">
                <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                  <ExternalLink className="w-4 h-4" />
                  查看帮助文档
                </button>
                <button
                  onClick={completeTroubleshooting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  完成故障排除
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 步骤指示器 */}
      <div className="px-6 py-3 bg-gray-100 border-t border-gray-200">
        <div className="flex items-center justify-center gap-2">
          {session.path.map((stepId, index) => (
            <div
              key={index}
              className={`w-2 h-2 rounded-full transition-colors ${
                index === session.path.length - 1
                  ? 'bg-blue-600'
                  : 'bg-green-500'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

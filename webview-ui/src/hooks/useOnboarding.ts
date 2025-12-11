import { postMessage } from "@/utils/vscode";
import {
  ExtensionResponse,
  ExtensionResponseMessage,
  UIRequest,
} from "@shared/types/messages";
import { useCallback, useEffect, useRef, useState } from "react";
import { useVSCodeMessage } from "./use-vscode-message";

/**
 * 检测到的本地服务
 */
export interface DetectedService {
  id: string;
  name: string;
  available: boolean;
  baseUrl: string;
  models?: string[];
  isFree: boolean;
  isLocal: boolean;
  priority: number;
}

/**
 * 快速开始模板
 */
export interface QuickStartTemplate {
  id: string;
  nameKey: string;
  descriptionKey: string;
  providerId: string;
  config: Record<string, unknown>;
  isFree: boolean;
  requiresApiKey: boolean;
  badge?: "recommended" | "free" | "local" | "fastest";
}

/**
 * 配置验证结果
 */
export interface ValidationResult {
  isValid: boolean;
  providerId: string;
  models?: string[];
  duration?: number;
  message?: string;
  errorType?: "auth" | "network" | "timeout" | "unknown";
}

/**
 * 引导状态
 */
export interface OnboardingStatus {
  completed: boolean;
  completedAt?: number;
  skipped?: boolean;
}

// Payload types for message handlers
interface OnboardingEnvironmentDetectedPayload {
  success: boolean;
  localServices?: DetectedService[];
  recommendedProvider?: DetectedService | null;
  hasLocalService?: boolean;
  error?: string;
}

interface OnboardingTemplatesLoadedPayload {
  success: boolean;
  templates?: QuickStartTemplate[];
}

interface OnboardingConfigValidatedPayload extends ValidationResult {
  success: boolean;
}

/**
 * Onboarding Hook - 提供环境检测、模板管理和配置验证功能
 */
export function useOnboarding() {
  const [isDetecting, setIsDetecting] = useState(true);
  const [isValidating, setIsValidating] = useState(false);
  const [localServices, setLocalServices] = useState<DetectedService[]>([]);
  const [templates, setTemplates] = useState<QuickStartTemplate[]>([]);
  const [recommendedProvider, setRecommendedProvider] =
    useState<DetectedService | null>(null);
  const [hasLocalService, setHasLocalService] = useState(false);
  const [onboardingStatus, setOnboardingStatus] = useState<OnboardingStatus>({
    completed: false,
  });
  const [validationResult, setValidationResult] =
    useState<ValidationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 处理环境检测结果
  useVSCodeMessage<
    ExtensionResponseMessage<OnboardingEnvironmentDetectedPayload>
  >(ExtensionResponse.OnboardingEnvironmentDetected, (message) => {
    setIsDetecting(false);
    const data = message.data;
    if (data?.success) {
      setLocalServices(data.localServices || []);
      setRecommendedProvider(data.recommendedProvider || null);
      setHasLocalService(data.hasLocalService || false);
      setError(null);
    } else {
      setError(data?.error || message.error || "Failed to detect environment");
    }
  });

  // 处理模板加载结果
  useVSCodeMessage<ExtensionResponseMessage<OnboardingTemplatesLoadedPayload>>(
    ExtensionResponse.OnboardingTemplatesLoaded,
    (message) => {
      const data = message.data;
      if (data?.success) {
        setTemplates(data.templates || []);
      }
    },
  );

  // 处理配置验证结果
  useVSCodeMessage<ExtensionResponseMessage<OnboardingConfigValidatedPayload>>(
    ExtensionResponse.OnboardingConfigValidated,
    (message) => {
      setIsValidating(false);
      const data = message.data;
      if (data?.success) {
        setValidationResult({
          isValid: data.isValid,
          providerId: data.providerId,
          models: data.models,
          duration: data.duration,
          message: data.message,
          errorType: data.errorType,
        });
      }
    },
  );

  // 处理引导状态
  useVSCodeMessage<ExtensionResponseMessage<OnboardingStatus>>(
    ExtensionResponse.OnboardingStatusLoaded,
    (message) => {
      const data = message.data;
      if (!data) {
        return;
      }
      setOnboardingStatus({
        completed: data.completed || false,
        completedAt: data.completedAt,
        skipped: data.skipped,
      });
    },
  );

  /**
   * 检测本地环境
   */
  const detectEnvironment = useCallback(() => {
    setIsDetecting(true);
    setError(null);
    postMessage(UIRequest.OnboardingDetectEnvironment);
  }, [setIsDetecting, setError]);

  /**
   * 获取快速开始模板
   */
  const getTemplates = useCallback(() => {
    postMessage(UIRequest.OnboardingGetTemplates);
  }, []);

  /**
   * 应用模板
   */
  const applyTemplate = useCallback((template: QuickStartTemplate) => {
    postMessage(UIRequest.OnboardingApplyTemplate, {
      templateId: template.id,
      template,
    });
  }, []);

  /**
   * 验证配置
   */
  const validateConfig = useCallback(
    (providerId: string, apiKey?: string, baseUrl?: string) => {
      setIsValidating(true);
      setValidationResult(null);
      postMessage(UIRequest.OnboardingValidateConfig, {
        providerId,
        apiKey,
        baseUrl,
      });
    },
    [setIsValidating, setValidationResult],
  );

  /**
   * 设置引导完成状态
   */
  const setCompleted = useCallback((completed: boolean, skipped?: boolean) => {
    postMessage(UIRequest.OnboardingSetCompleted, { completed, skipped });
  }, []);

  /**
   * 获取引导状态
   */
  const getStatus = useCallback(() => {
    postMessage(UIRequest.OnboardingGetStatus);
  }, []);

  // 初始化时自动检测环境和获取模板
  const initRef = useRef(false);
  useEffect(() => {
    if (initRef.current) {
      return;
    }
    initRef.current = true;
    // The initial state is set to true, and we just need to fire the messages.
    // The message handlers will update the state upon receiving a response.
    postMessage(UIRequest.OnboardingDetectEnvironment);
    postMessage(UIRequest.OnboardingGetTemplates);
    postMessage(UIRequest.OnboardingGetStatus);
  }, []);

  return {
    // 状态
    isDetecting,
    isValidating,
    localServices,
    templates,
    recommendedProvider,
    hasLocalService,
    onboardingStatus,
    validationResult,
    error,

    // 方法
    detectEnvironment,
    getTemplates,
    applyTemplate,
    validateConfig,
    setCompleted,
    getStatus,
  };
}

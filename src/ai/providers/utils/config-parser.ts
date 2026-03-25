/**
 * AI Provider 配置解析工具
 * 统一处理所有 Provider 的配置结构，确保一致性
 */

import { Logger } from "@/utils/logger";

const logger = Logger.getInstance("ConfigParser");

/**
 * 标准化的 Provider 配置接口
 */
export interface StandardProviderConfig {
  apiKey?: string;
  baseUrl?: string;
  apiVersion?: string;
  providerId?: string;
  providerName?: string;
  defaultModel?: string;
  [key: string]: any;
}

/**
 * 解析 Provider 配置，支持多种配置结构
 *
 * 支持的配置结构：
 * 1. 直接结构: { apiKey: 'xxx', baseUrl: 'xxx', ... }
 * 2. 嵌套结构: { providers: { xxx: { apiKey: 'xxx', ... } } }
 *
 * @param config - 原始配置对象
 * @param providerId - Provider ID (用于嵌套结构解析)
 * @returns 标准化的配置对象
 */
export function parseProviderConfig(
  config?: any,
  providerId?: string
): StandardProviderConfig {
  if (!config) {
    return {};
  }

  // 优先使用直接结构（当前系统标准）
  if (config.apiKey || config.baseUrl) {
    return {
      apiKey: config.apiKey,
      baseUrl: config.baseUrl,
      apiVersion: config.apiVersion,
      providerId: config.providerId,
      providerName: config.providerName,
      defaultModel: config.defaultModel,
      ...config,
    };
  }

  // 回退到嵌套结构（兼容旧配置）
  if (config.providers && providerId && config.providers[providerId]) {
    const nestedConfig = config.providers[providerId];
    return {
      apiKey: nestedConfig.apiKey,
      baseUrl: nestedConfig.baseUrl,
      apiVersion: nestedConfig.apiVersion,
      providerId: nestedConfig.providerId || providerId,
      providerName: nestedConfig.providerName,
      defaultModel: nestedConfig.defaultModel,
      ...nestedConfig,
    };
  }

  // 如果都没有，返回空配置
  return {};
}

/**
 * 从配置中安全地提取 API Key
 *
 * @param config - 配置对象
 * @param providerId - Provider ID (可选，用于嵌套结构)
 * @returns API Key 或空字符串
 */
export function extractApiKey(config?: any, providerId?: string): string {
  if (!config) {
    return "";
  }

  // 1. 尝试直接结构
  if (config.apiKey) {
    return config.apiKey;
  }

  // 2. 尝试嵌套结构
  if (config.providers && providerId && config.providers[providerId]) {
    return config.providers[providerId].apiKey || "";
  }

  return "";
}

/**
 * 从配置中安全地提取 Base URL
 *
 * @param config - 配置对象
 * @param providerId - Provider ID (可选)
 * @returns Base URL 或 undefined
 */
export function extractBaseUrl(config?: any, providerId?: string): string | undefined {
  if (!config) {
    return undefined;
  }

  // 1. 尝试直接结构
  if (config.baseUrl) {
    return config.baseUrl;
  }

  // 2. 尝试嵌套结构
  if (config.providers && providerId && config.providers[providerId]) {
    return config.providers[providerId].baseUrl;
  }

  return undefined;
}

/**
 * 从配置中安全地提取 API Version
 *
 * @param config - 配置对象
 * @param providerId - Provider ID (可选)
 * @returns API Version 或 undefined
 */
export function extractApiVersion(config?: any, providerId?: string): string | undefined {
  if (!config) {
    return undefined;
  }

  // 1. 尝试直接结构
  if (config.apiVersion) {
    return config.apiVersion;
  }

  // 2. 尝试嵌套结构
  if (config.providers && providerId && config.providers[providerId]) {
    return config.providers[providerId].apiVersion;
  }

  return undefined;
}

/**
 * 调试用：记录配置解析详情
 *
 * @param config - 原始配置
 * @param providerId - Provider ID
 * @param result - 解析结果
 */
export function logConfigParsing(
  config: any,
  providerId: string,
  result: StandardProviderConfig
): void {
  if (process.env.NODE_ENV === "development") {
    logger.debug(`[ConfigParser:${providerId}]`, {
      data: {
        hasConfig: !!config,
        hasApiKey: !!result.apiKey,
        configKeys: config ? Object.keys(config) : [],
        hasProviders: !!config?.providers,
        hasNestedConfig: !!(config?.providers && config.providers[providerId]),
        resultKeys: Object.keys(result),
      },
    });
  }
}

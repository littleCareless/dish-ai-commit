/**
 * 统一验证引擎
 * 支持多种验证规则和异步验证
 */

import {
  ExtendedProviderConfig,
  FieldMetadata,
  ProviderMetadata,
  ValidationResult,
  ValidationRule,
  ValidationRuleType,
} from "../types/provider-metadata";

export class ValidationEngine {
  private static instance: ValidationEngine;
  private validationCache = new Map<string, ValidationResult>();

  static getInstance(): ValidationEngine {
    if (!ValidationEngine.instance) {
      ValidationEngine.instance = new ValidationEngine();
    }
    return ValidationEngine.instance;
  }

  /**
   * 验证单个字段
   */
  async validateField(
    field: FieldMetadata,
    value: any,
  ): Promise<ValidationResult> {
    const cacheKey = `${field.key}-${JSON.stringify(value)}`;

    // 检查缓存
    if (this.validationCache.has(cacheKey)) {
      return this.validationCache.get(cacheKey)!;
    }

    const errors: string[] = [];
    let isValid = true;

    // 如果字段为空且不是必填，直接返回成功
    if (
      (value === null || value === undefined || value === "") &&
      !field.required
    ) {
      const result: ValidationResult = {
        field: field.key,
        valid: true,
        errors: [],
      };
      this.validationCache.set(cacheKey, result);
      return result;
    }

    // 必填验证
    if (
      field.required &&
      (value === null || value === undefined || value === "")
    ) {
      errors.push("此字段是必需的");
      isValid = false;
    }

    // 如果值为空且不是必填，跳过其他验证
    if (value === null || value === undefined || value === "") {
      const result: ValidationResult = {
        field: field.key,
        valid: isValid,
        errors,
      };
      this.validationCache.set(cacheKey, result);
      return result;
    }

    // 执行字段的验证规则
    if (field.validation) {
      for (const rule of field.validation) {
        try {
          const ruleResult = await this.validateRule(rule, value, field);
          if (!ruleResult.valid) {
            errors.push(ruleResult.message);
            isValid = false;
          }
        } catch (error) {
          errors.push(
            `验证错误: ${error instanceof Error ? error.message : "未知错误"}`,
          );
          isValid = false;
        }
      }
    }

    const result: ValidationResult = {
      field: field.key,
      valid: isValid,
      errors,
    };

    // 缓存结果
    this.validationCache.set(cacheKey, result);
    return result;
  }

  /**
   * 验证单个规则
   */
  private async validateRule(
    rule: ValidationRule,
    value: any,
    _field: FieldMetadata,
  ): Promise<{ valid: boolean; message: string }> {
    switch (rule.type) {
      case ValidationRuleType.REQUIRED:
        return {
          valid: value !== null && value !== undefined && value !== "",
          message: rule.message,
        };

      case ValidationRuleType.PATTERN:
        if (rule.pattern) {
          return {
            valid: rule.pattern.test(String(value)),
            message: rule.message,
          };
        }
        return { valid: true, message: "" };

      case ValidationRuleType.MIN:
        if (rule.min !== undefined) {
          const numValue = Number(value);
          return {
            valid: !isNaN(numValue) && numValue >= rule.min,
            message: rule.message,
          };
        }
        return { valid: true, message: "" };

      case ValidationRuleType.MAX:
        if (rule.max !== undefined) {
          const numValue = Number(value);
          return {
            valid: !isNaN(numValue) && numValue <= rule.max,
            message: rule.message,
          };
        }
        return { valid: true, message: "" };

      case ValidationRuleType.EMAIL:
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return {
          valid: emailPattern.test(String(value)),
          message: rule.message,
        };

      case ValidationRuleType.URL:
        try {
          new URL(String(value));
          return { valid: true, message: "" };
        } catch {
          return {
            valid: false,
            message: rule.message,
          };
        }

      case ValidationRuleType.CUSTOM:
        if (rule.validator) {
          try {
            const result = await rule.validator(value);
            return {
              valid: Boolean(result),
              message: rule.message,
            };
          } catch (error) {
            return {
              valid: false,
              message: `${rule.message} (${error instanceof Error ? error.message : "验证失败"})`,
            };
          }
        }
        return { valid: true, message: "" };

      default:
        return { valid: true, message: "" };
    }
  }

  /**
   * 验证所有字段
   */
  async validateAll(
    metadata: ProviderMetadata,
    config: ExtendedProviderConfig,
  ): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];

    for (const field of metadata.fields) {
      const value = this.getValueFromConfig(field, config);
      const result = await this.validateField(field, value);
      results.push(result);
    }

    return results;
  }

  /**
   * 从配置中获取字段值
   */
  private getValueFromConfig(
    field: FieldMetadata,
    config: ExtendedProviderConfig,
  ): any {
    // 优先从 customFields 获取
    if (config.customFields && config.customFields.hasOwnProperty(field.key)) {
      return config.customFields[field.key];
    }

    // 从配置对象的直接属性获取
    return (config as any)[field.key];
  }

  /**
   * 验证配置是否有效
   */
  async isValid(
    metadata: ProviderMetadata,
    config: ExtendedProviderConfig,
  ): Promise<boolean> {
    const results = await this.validateAll(metadata, config);
    return results.every((result) => result.valid);
  }

  /**
   * 获取字段错误信息
   */
  getFieldErrors(results: ValidationResult[], fieldKey: string): string[] {
    const result = results.find((r) => r.field === fieldKey);
    return result ? result.errors : [];
  }

  /**
   * 清除验证缓存
   */
  clearCache(): void {
    this.validationCache.clear();
  }

  /**
   * 清除特定字段的缓存
   */
  clearFieldCache(fieldKey: string): void {
    for (const [key] of this.validationCache) {
      if (key.startsWith(`${fieldKey}-`)) {
        this.validationCache.delete(key);
      }
    }
  }

  /**
   * 异步验证 API Key（示例）
   */
  async validateApiKey(
    providerId: string,
    apiKey: string,
  ): Promise<{ valid: boolean; message: string }> {
    // 这里可以实现实际的 API Key 验证逻辑
    // 例如发送测试请求到相应的 API 端点

    try {
      // 模拟异步验证
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // 简单的格式验证
      if (providerId === "openai" && !apiKey.startsWith("sk-")) {
        return { valid: false, message: "OpenAI API Key 格式不正确" };
      }

      if (providerId === "anthropic" && !apiKey.startsWith("sk-ant-")) {
        return { valid: false, message: "Anthropic API Key 格式不正确" };
      }

      return { valid: true, message: "API Key 验证成功" };
    } catch (error) {
      return {
        valid: false,
        message: `API Key 验证失败: ${error instanceof Error ? error.message : "未知错误"}`,
      };
    }
  }

  /**
   * 验证 URL 连通性
   */
  async validateUrl(url: string): Promise<{ valid: boolean; message: string }> {
    try {
      // 验证 URL 格式
      new URL(url);

      // 这里可以实现实际的连通性测试
      // 例如发送 HEAD 请求检查端点是否可达

      return { valid: true, message: "URL 格式正确" };
    } catch (error) {
      return {
        valid: false,
        message: `URL 格式不正确: ${error instanceof Error ? error.message : "未知错误"}`,
      };
    }
  }
}

// 导出单例实例
export const validationEngine = ValidationEngine.getInstance();

// 导出便捷函数
export const validateField = (field: FieldMetadata, value: any) =>
  validationEngine.validateField(field, value);

export const validateAll = (
  metadata: ProviderMetadata,
  config: ExtendedProviderConfig,
) => validationEngine.validateAll(metadata, config);

export const isValid = (
  metadata: ProviderMetadata,
  config: ExtendedProviderConfig,
) => validationEngine.isValid(metadata, config);

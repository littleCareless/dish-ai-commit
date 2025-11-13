/**
 * 配置验证器工具
 * 统一处理提供商配置的验证逻辑，确保按钮禁用状态的一致性
 */

import { FieldMetadata, ProviderMetadata } from "../types/provider-metadata";

/**
 * 检查字段是否有值（考虑空字符串和空白字符）
 */
export function isFieldValueValid(value: unknown): boolean {
  if (value === null || value === undefined) {
    return false;
  }
  if (typeof value === "string") {
    return value.trim().length > 0;
  }
  if (typeof value === "boolean") {
    return true;
  }
  if (typeof value === "number") {
    return !isNaN(value);
  }
  return Boolean(value);
}

/**
 * 检查必填字段是否都已填写
 */
export function areRequiredFieldsFilled(
  fields: FieldMetadata[],
  values: Record<string, unknown>,
  conditionalFields?: Record<string, boolean>,
): boolean {
  return fields.every((field) => {
    // 跳过条件字段
    if (conditionalFields && !conditionalFields[field.key]) {
      return true;
    }

    if (field.required) {
      return isFieldValueValid(values[field.key]);
    }
    return true;
  });
}

/**
 * 获取所有应该显示的必填字段
 */
export function getVisibleRequiredFields(
  fields: FieldMetadata[],
  values: Record<string, unknown>,
): FieldMetadata[] {
  return fields.filter((field) => {
    if (!field.required) {
      return false;
    }

    // 检查条件显示
    if (field.conditional) {
      const { field: dependentField, value: expectedValue } = field.conditional;
      const conditionValue = values[dependentField];
      return conditionValue === expectedValue;
    }

    return true;
  });
}

/**
 * 检查配置是否有效（适用于测试连接或高级操作）
 * 这个方法会检查提供商所需的最少配置
 */
export function isProviderConfigValid(
  metadata: ProviderMetadata,
  values: Record<string, unknown>,
): { isValid: boolean; missingFields: string[] } {
  const missingFields: string[] = [];
  const visibleRequiredFields = getVisibleRequiredFields(
    metadata.fields,
    values,
  );

  visibleRequiredFields.forEach((field) => {
    if (!isFieldValueValid(values[field.key])) {
      missingFields.push(field.label);
    }
  });

  return {
    isValid: missingFields.length === 0,
    missingFields,
  };
}

/**
 * 检查是否有足够的信息来获取模型列表
 * 某些提供商可能只需要 baseUrl，某些需要 apiKey
 */
export function canFetchModels(
  metadata: ProviderMetadata,
  values: Record<string, unknown>,
): { canFetch: boolean; reason?: string } {
  // 如果提供商没有任何配置字段（如 VSCode 内置 AI、LM Studio 仅需 baseUrl），直接允许获取模型
  if (metadata.fields.length === 0) {
    return { canFetch: true };
  }

  const apiKey = typeof values.apiKey === "string" ? values.apiKey.trim() : "";
  const baseUrlValue = values.baseURL || values.baseUrl;
  const baseUrl = typeof baseUrlValue === "string" ? baseUrlValue.trim() : "";

  // 至少需要 apiKey 或 baseUrl 之一
  if (!apiKey && !baseUrl) {
    return {
      canFetch: false,
      reason: "请先输入 API Key 或自定义 Base URL",
    };
  }

  return { canFetch: true };
}

/**
 * 验证单个字段值
 */
export function validateFieldValue(
  field: FieldMetadata,
  value: unknown,
): { isValid: boolean; error?: string } {
  // 检查必填
  if (field.required && !isFieldValueValid(value)) {
    return {
      isValid: false,
      error: `${field.label} 是必需的`,
    };
  }

  // 检查验证规则
  if (
    field.validation &&
    field.validation.length > 0 &&
    isFieldValueValid(value)
  ) {
    for (const rule of field.validation) {
      // 仅对字符串类型的值应用以下验证
      if (typeof value === "string") {
        switch (rule.type) {
          case "pattern":
            if (rule.pattern && !rule.pattern.test(value)) {
              return { isValid: false, error: rule.message };
            }
            break;
          case "min":
            if (rule.min !== undefined && value.length < rule.min) {
              return { isValid: false, error: rule.message };
            }
            break;
          case "max":
            if (rule.max !== undefined && value.length > rule.max) {
              return { isValid: false, error: rule.message };
            }
            break;
        }
      }
    }
  }

  return { isValid: true };
}

/**
 * 验证规则转换工具
 * 将 provider-registry.ts 中的验证规则转换为 Zod schema
 */

import { z } from "zod";
import {
  FieldConfig,
  FieldType,
  ValidationRuleType,
} from "../types/provider-metadata";

/**
 * 根据字段类型获取基础 Zod schema
 */
function getBaseSchema(fieldType: FieldType): z.ZodTypeAny {
  switch (fieldType) {
    case FieldType.PASSWORD:
    case FieldType.TEXT:
    case FieldType.URL:
      return z.string();
    case FieldType.NUMBER:
      return z.number();
    case FieldType.CHECKBOX:
      return z.boolean();
    case FieldType.SELECT:
      return z.string();
    case FieldType.SLIDER:
      return z.number();
    case FieldType.CUSTOM:
      return z.any();
    default:
      return z.string();
  }
}

/**
 * 将验证规则转换为 Zod schema
 */
function applyValidationRules(
  schema: z.ZodTypeAny,
  rules: any[],
): z.ZodTypeAny {
  let result = schema;

  rules.forEach((rule) => {
    switch (rule.type) {
      case ValidationRuleType.REQUIRED:
        if (result instanceof z.ZodString) {
          result = result.min(1, rule.message);
        }
        break;
      case ValidationRuleType.PATTERN:
        if (result instanceof z.ZodString) {
          result = result.regex(rule.pattern, rule.message);
        }
        break;
      case ValidationRuleType.MIN:
        if (result instanceof z.ZodNumber) {
          result = result.min(rule.min, rule.message);
        } else if (result instanceof z.ZodString) {
          result = result.min(rule.min, rule.message);
        }
        break;
      case ValidationRuleType.MAX:
        if (result instanceof z.ZodNumber) {
          result = result.max(rule.max, rule.message);
        } else if (result instanceof z.ZodString) {
          result = result.max(rule.max, rule.message);
        }
        break;
      case ValidationRuleType.EMAIL:
        if (result instanceof z.ZodString) {
          result = result.email(rule.message);
        }
        break;
      case ValidationRuleType.URL:
        if (result instanceof z.ZodString) {
          result = result.url(rule.message);
        }
        break;
      case ValidationRuleType.CUSTOM:
        if (rule.validator) {
          result = result.refine(rule.validator, rule.message);
        }
        break;
    }
  });

  return result;
}

/**
 * 为字段创建 Zod 验证器
 */
export function createZodValidator(field: FieldConfig): z.ZodTypeAny {
  let schema = getBaseSchema(field.type);

  // 应用验证规则
  if (field.validation && field.validation.length > 0) {
    schema = applyValidationRules(schema, field.validation);
  }

  // 处理必填/可选
  if (field.required) {
    return schema;
  } else {
    return schema.optional();
  }
}

/**
 * 为提供商创建完整的 Zod schema
 */
export function createProviderSchema(fields: FieldConfig[]): z.ZodObject<any> {
  const schemaObject = fields.reduce(
    (acc, field) => {
      acc[field.key] = createZodValidator(field);
      return acc;
    },
    {} as Record<string, z.ZodTypeAny>,
  );

  return z.object(schemaObject);
}

/**
 * 验证字段值
 */
export function validateFieldValue(
  field: FieldConfig,
  value: any,
): { isValid: boolean; error?: string } {
  try {
    const validator = createZodValidator(field);
    validator.parse(value);
    return { isValid: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        isValid: false,
        error: error.issues[0]?.message || "验证失败",
      };
    }
    return {
      isValid: false,
      error: "未知验证错误",
    };
  }
}

/**
 * 检查字段是否应该显示（条件显示逻辑）
 */
export function shouldShowField(
  field: FieldConfig,
  formValues: Record<string, any>,
): boolean {
  if (!field.conditional) {
    return true;
  }

  const { field: dependentField, value } = field.conditional;
  const conditionValue = formValues[dependentField];

  const shouldShow = conditionValue === value;

  // ✅ 仅在开发环境输出调试日志
  if (process.env.NODE_ENV === "development") {
    console.debug(
      `[shouldShowField] field=${field.key}, dependentField=${dependentField}, ` +
        `conditionValue=${conditionValue}, expectedValue=${value}, shouldShow=${shouldShow}`,
    );
  }

  return shouldShow;
}

/**
 * 获取字段的默认值
 */
export function getFieldDefaultValue(field: FieldConfig): any {
  if (field.defaultValue !== undefined) {
    return field.defaultValue;
  }

  switch (field.type) {
    case FieldType.PASSWORD:
    case FieldType.TEXT:
    case FieldType.URL:
    case FieldType.SELECT:
      return "";
    case FieldType.NUMBER:
    case FieldType.SLIDER:
      return 0;
    case FieldType.CHECKBOX:
      return false;
    case FieldType.CUSTOM:
      return null;
    default:
      return "";
  }
}

/**
 * AI提供商配置验证器
 *
 * 功能：
 * 1. 验证当前选择的AI提供商配置是否有效
 * 2. 检查必要的配置字段（如API密钥或基础URL）是否已设置
 * 3. 对缺失的必要配置提供用户友好的错误提示
 * 4. 提供快捷方式让用户直接导航到相关配置设置
 * 5. 区分处理不同提供商的特定配置要求
 *
 * 主要职责：
 * - 确保AI提供商配置完整有效，避免因配置不当导致运行错误
 * - 在配置无效时提供清晰的反馈和修复路径
 * - 实现不同AI提供商的配置验证逻辑
 * - 针对VS Code内置AI提供商提供特殊处理逻辑
 *
 * 在扩展架构中，作为配置系统的验证层，确保在使用AI功能前
 * 所有必要的提供商配置已正确设置，增强用户体验并减少配置错误。
 * 当验证失败时，引导用户完成配置过程，简化配置体验。
 */
import * as vscode from "vscode";
import { PROVIDER_REQUIRED_FIELDS, ExtensionConfiguration } from "../types";
import { getMessage } from "../../utils/i18n";
import { notify } from "../../utils/notification/notification-manager";

/**
 * 验证AI提供商配置
 */
export class ProviderConfigValidator {
  public async validateConfiguration(
    config: ExtensionConfiguration
  ): Promise<boolean> {
    const provider = (config.base.provider as string).toLowerCase();

    // VS Code 提供的AI不需要验证
    if (provider === "vs code provided") {
      return true;
    }

    // 检查是否是支持的提供商
    if (provider in PROVIDER_REQUIRED_FIELDS) {
      const requiredField = PROVIDER_REQUIRED_FIELDS[provider];
      return this.validateProviderConfig(
        provider as keyof ExtensionConfiguration["providers"],
        requiredField,
        config
      );
    }

    return false;
  }

  private async validateProviderConfig(
    provider: keyof ExtensionConfiguration["providers"],
    requiredField: "apiKey" | "baseUrl",
    config: ExtensionConfiguration
  ): Promise<boolean> {
    const providerConfig = config.providers[provider];

    if (
      !providerConfig ||
      !(requiredField in providerConfig) ||
      !providerConfig[requiredField as keyof typeof providerConfig]
    ) {
      const settingKey = `providers.${provider.toLowerCase()}.${requiredField.toLowerCase()}`;
      const action = await notify.error(
        `${requiredField}.missing`,
        [provider],
        {
          buttons: [getMessage("button.yes"), getMessage("button.no")]
        }
      );

      if (action === getMessage("button.yes")) {
        await vscode.commands.executeCommand(
          "workbench.action.openSettings",
          `dish-ai-commit.${settingKey}`
        );
      }
      return false;
    }
    return true;
  }
}

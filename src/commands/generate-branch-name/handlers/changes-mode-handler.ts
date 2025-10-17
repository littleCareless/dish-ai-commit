import { Logger } from "../../../utils/logger";
import { notify } from "../../../utils/notification/notification-manager";
import { getMessage } from "../../../utils/i18n";
import { SCMDetectorService } from "../../../services/scm-detector-service";

/**
 * 代码变更模式处理器
 * 负责处理"从代码变更生成分支名称"的场景
 */
export class ChangesModeHandler {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * 处理代码变更模式的分支名称生成
   * @param resources - 源代码管理资源状态列表
   * @param aiProvider - AI 提供程序
   * @param model - 选中的模型
   * @param configuration - 配置对象
   * @param detectSCMProvider - SCM 提供程序检测函数
   * @returns {Promise<{branchName: string, scmProvider: any} | undefined>} 生成的分支名称和 SCM 提供程序
   */
  async handle(
    resources: any,
    aiProvider: any,
    model: any,
    configuration: any,
    detectSCMProvider: (files: any) => Promise<any>
  ): Promise<{ branchName: string; scmProvider: any } | undefined> {
    this.logger.info("Handling changes mode for branch name generation");

    // 获取选中的文件
    let selectedFiles = SCMDetectorService.getSelectedFiles(resources);
    
    // 如果没有明确选中的文件，获取所有变更
    if (!selectedFiles || selectedFiles.length === 0) {
      selectedFiles = undefined;
    }

    // 检测 SCM 提供程序
    const result = await detectSCMProvider(selectedFiles);
    if (!result) {
      this.logger.warn("SCM provider not detected.");
      return undefined;
    }

    const { scmProvider: detectedScmProvider } = result;
    this.logger.info(`SCM provider detected: ${detectedScmProvider.type}`);

    // 检查是否为 Git（分支名称生成只支持 Git）
    if (detectedScmProvider.type !== "git") {
      this.logger.warn("Branch name generation is only supported for Git.");
      await notify.warn("branch.name.git.only");
      return undefined;
    }

    // 获取文件差异
    const aiInputContent = await detectedScmProvider.getDiff(selectedFiles);
    if (!aiInputContent) {
      this.logger.warn("No diff content found for branch name generation.");
      await notify.warn(getMessage("no.changes.found"));
      return undefined;
    }

    this.logger.info(
      `Diff content collected for branch name generation. Length: ${aiInputContent.length}`
    );

    try {
      // 调用 AI 生成分支名称
      const branchNameResult = await aiProvider?.generateBranchName?.({
        ...configuration.base,
        ...configuration.features.branchName,
        diff: aiInputContent,
        model: model,
        scm: detectedScmProvider.type,
      });

      if (!branchNameResult?.content) {
        this.logger.error("AI failed to generate branch name from changes.");
        await notify.error(getMessage("branch.name.generation.failed"));
        return undefined;
      }

      this.logger.info(`AI generated branch name from changes: ${branchNameResult.content}`);
      
      return {
        branchName: branchNameResult.content,
        scmProvider: detectedScmProvider,
      };
    } catch (error) {
      this.logger.error(`Failed to generate branch name from changes: ${error}`);
      await notify.error(getMessage("branch.name.generation.failed"));
      return undefined;
    }
  }
}

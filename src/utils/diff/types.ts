import { ProfileManagerService } from "@/services/profile-manager/profile-manager-service";

export interface DiffChunk {
  filename: string;
  content: string;
  isNonCodeFile?: boolean;
}

export enum FilePathMode {
  AsAttribute = "AsAttribute",
  AsComment = "AsComment",
  None = "None",
}

export interface DiffConfig {
  enabled: boolean;
  contextLines: number;
  filePathMode: FilePathMode;
  lineNumberStyle: "legacy" | "default";
}

/**
 * 从 profile 系统获取差异简化的相关设置
 */
export function getDiffConfig(): DiffConfig {
  try {
    const profileManager = ProfileManagerService.getInstance();
    const featureSettings = profileManager.getFeatureSettings();
    
    // 从 featureSettings 获取配置，如果没有则使用默认值
    return {
      enabled: featureSettings.simplifyDiff ?? false,
      contextLines: 3, // 这个配置项暂时不在 FeatureSettings 中，使用默认值
      filePathMode: FilePathMode.AsComment, // 这个配置项暂时不在 FeatureSettings 中，使用默认值
      lineNumberStyle: "default", // 这个配置项暂时不在 FeatureSettings 中，使用默认值
    };
  } catch (error) {
    // 如果获取失败，返回默认值
    return {
      enabled: false,
      contextLines: 3,
      filePathMode: FilePathMode.AsComment,
      lineNumberStyle: "default",
    };
  }
}

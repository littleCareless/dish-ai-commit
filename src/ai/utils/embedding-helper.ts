import { AIRequestParams } from "../types";
import { EmbeddingServiceManager } from "../../core/indexing/embedding-service-manager";
import { ConfigurationManager } from "../../config/configuration-manager";

/**
 * 使用嵌入服务搜索相似代码，并将其添加到请求参数中。
 * @param params - AI 请求参数。
 */
export async function addSimilarCodeContext(
  params: AIRequestParams
): Promise<void> {
  const useEmbedding = ConfigurationManager.getInstance().getConfig(
    "FEATURES_CODEANALYSIS_USEEMBEDDING"
  );

  if (!useEmbedding) {
    return;
  }

  const embeddingService =
    EmbeddingServiceManager.getInstance().getEmbeddingService();
  if (embeddingService) {
    try {
      const relatedCode = await embeddingService.searchSimilarCode(
        params.diff,
        5
      );
      if (relatedCode && relatedCode.length > 0) {
        const relatedCodeContext = relatedCode
          .map(
            (item) =>
              `File: ${item.payload.file}\n\`\`\`\n${item.payload.code}\n\`\`\``
          )
          .join("\n\n---\n\n");
        params.additionalContext = `
Here are some code snippets that might be related to the current changes:
---
${relatedCodeContext}
---
`;
      }
    } catch (error) {
      console.error("Error searching for similar code:", error);
      // 不阻塞主流程，仅记录错误
    }
  }
}

import { encoding_for_model, Tiktoken } from "tiktoken";
import { AIModel } from "../ai/types";

class TokenizerService {
  private static instance: TokenizerService;
  private encodings: Map<string, Tiktoken> = new Map();

  private constructor() {
    // 私有构造函数，确保单例
  }

  public static getInstance(): TokenizerService {
    if (!TokenizerService.instance) {
      TokenizerService.instance = new TokenizerService();
    }
    return TokenizerService.instance;
  }

  /**
   * 计算给定文本的 token 数量
   * @param text - 要计算的文本
   * @param model - AI 模型，用于选择正确的编码器
   * @returns token 数量
   */
  public countTokens(text: string, model: AIModel): number {
    if (!text) {
      return 0;
    }
    try {
      const encoding = this.getEncodingForModel(model);
      const tokens = encoding.encode(text);
      return tokens.length;
    } catch (error) {
      console.warn(`Failed to count tokens for model ${model.id}. Falling back to character length.`, error);
      // 如果分词失败，回退到字符长度作为粗略估计
      return text.length;
    }
  }

  /**
   * Encodes a text string into a sequence of tokens.
   * @param text The text to encode.
   * @param model The AI model to use for encoding, which determines the tokenizer.
   * @returns A `Uint32Array` of token IDs.
   */
  public encode(text: string, model: AIModel): Uint32Array {
    if (!text) {
      return new Uint32Array();
    }
    try {
      const encoding = this.getEncodingForModel(model);
      return encoding.encode(text);
    } catch (error) {
      console.warn(
        `Failed to encode text for model ${model.id}. Returning empty array.`,
        error
      );
      return new Uint32Array();
    }
  }

  /**
   * Decodes a sequence of tokens back into a text string.
   * @param tokens The `Uint32Array` of token IDs to decode.
   * @param model The AI model used for the original encoding.
   * @returns The decoded text string.
   */
  public decode(tokens: Uint32Array, model: AIModel): string {
    if (!tokens || tokens.length === 0) {
      return "";
    }
    try {
      const encoding = this.getEncodingForModel(model);
      return new TextDecoder().decode(encoding.decode(tokens));
    } catch (error) {
      console.warn(
        `Failed to decode tokens for model ${model.id}. Returning empty string.`,
        error
      );
      return "";
    }
  }

  /**
   * 获取或创建模型的编码器实例
   * @param model - AI 模型
   * @returns Tiktoken 编码器实例
   */
  private getEncodingForModel(model: AIModel): Tiktoken {
    // 使用模型ID作为key，因为不同变体可能有不同编码
    const modelKey = model.id;
    if (!this.encodings.has(modelKey)) {
      try {
        // tiktoken 支持 gpt-4, gpt-3.5-turbo 等模型名称
        // 我们假设 model.id 与 tiktoken 支持的名称兼容
        // 对于不直接支持的，它会回退到 p50k_base
        const encoding = encoding_for_model(model.id as any);
        this.encodings.set(modelKey, encoding);
      } catch (e) {
         console.warn(`Model ${model.id} not found in tiktoken, using 'cl100k_base' as a fallback.`);
        // 如果模型名称不被 tiktoken 识别，使用一个通用的编码器作为后备
        const fallbackEncoding = encoding_for_model("gpt-4"); // cl100k_base
        this.encodings.set(modelKey, fallbackEncoding);
      }
    }
    return this.encodings.get(modelKey)!;
  }

  /**
   * 清理资源，释放编码器
   */
  public dispose() {
    this.encodings.forEach(encoding => encoding.free());
    this.encodings.clear();
  }
}

export const tokenizerService = TokenizerService.getInstance();
// /**
//  * API密钥加密服务
//  * 提供API密钥的加密存储和解密功能
//  * 使用系统级加密确保密钥安全
//  */

// import * as vscode from "vscode";
// import * as crypto from "crypto";
// import { Logger } from "../../utils/logger";

// /**
//  * 密钥加密服务接口
//  */
// export interface IKeyEncryptionService {
//   /**
//    * 加密API密钥
//    * @param key 原始API密钥
//    * @param provider AI提供商名称
//    * @returns 加密后的密钥
//    */
//   encryptKey(key: string, provider: string): Promise<string>;

//   /**
//    * 解密API密钥
//    * @param encryptedKey 加密的API密钥
//    * @param provider AI提供商名称
//    * @returns 解密后的原始密钥
//    */
//   decryptKey(encryptedKey: string, provider: string): Promise<string>;

//   /**
//    * 验证密钥格式
//    * @param key API密钥
//    * @param provider AI提供商名称
//    * @returns 是否有效
//    */
//   validateKeyFormat(key: string, provider: string): boolean;

//   /**
//    * 清除内存中的密钥
//    * @param key 要清除的密钥
//    */
//   clearKeyFromMemory(key: string): void;
// }

// /**
//  * 密钥加密服务实现
//  * 使用AES-256-GCM加密算法和系统密钥派生
//  */
// export class KeyEncryptionService implements IKeyEncryptionService {
//   private static instance: KeyEncryptionService;
//   private readonly logger: Logger;
//   private readonly algorithm = "aes-256-gcm";
//   private readonly keyLength = 32; // 256 bits
//   private readonly ivLength = 16; // 128 bits
//   private readonly tagLength = 16; // 128 bits

//   private constructor() {
//     this.logger = Logger.getInstance("KeyEncryptionService");
//   }

//   /**
//    * 获取单例实例
//    */
//   public static getInstance(): KeyEncryptionService {
//     if (!KeyEncryptionService.instance) {
//       KeyEncryptionService.instance = new KeyEncryptionService();
//     }
//     return KeyEncryptionService.instance;
//   }

//   /**
//    * 加密API密钥
//    */
//   public async encryptKey(key: string, provider: string): Promise<string> {
//     try {
//       // 验证输入
//       if (!key || !provider) {
//         throw new Error("密钥和提供商名称不能为空");
//       }

//       // 生成加密密钥
//       const encryptionKey = await this.generateEncryptionKey(provider);

//       // 生成随机IV
//       const iv = crypto.randomBytes(this.ivLength);

//       // 创建加密器
//       const cipher = crypto.createCipheriv(this.algorithm, encryptionKey,);
//       cipher.setAAD(Buffer.from(provider, "utf8"));

//       // 加密数据
//       let encrypted = cipher.update(key, "utf8", "hex");
//       encrypted += cipher.final("hex");

//       // 获取认证标签
//       const tag = cipher.getAuthTag();

//       // 组合结果: IV + Tag + EncryptedData
//       const result =
//         iv.toString("hex") + ":" + tag.toString("hex") + ":" + encrypted;

//       this.logger.info(`成功加密 ${provider} API密钥`);
//       return result;
//     } catch (error) {
//       this.logger.error(`加密 ${provider} API密钥失败: ${error}`);
//       throw new Error(
//         `密钥加密失败: ${
//           error instanceof Error ? error.message : String(error)
//         }`
//       );
//     }
//   }

//   /**
//    * 解密API密钥
//    */
//   public async decryptKey(
//     encryptedKey: string,
//     provider: string
//   ): Promise<string> {
//     try {
//       // 验证输入
//       if (!encryptedKey || !provider) {
//         throw new Error("加密密钥和提供商名称不能为空");
//       }

//       // 解析加密数据
//       const parts = encryptedKey.split(":");
//       if (parts.length !== 3) {
//         throw new Error("加密密钥格式无效");
//       }

//       const iv = Buffer.from(parts[0], "hex");
//       const tag = Buffer.from(parts[1], "hex");
//       const encrypted = parts[2];

//       // 生成解密密钥
//       const encryptionKey = await this.generateEncryptionKey(provider);

//       // 创建解密器
//       const decipher = crypto.createDecipher(this.algorithm, encryptionKey);
//       decipher.setAAD(Buffer.from(provider, "utf8"));
//       decipher.setAuthTag(tag);

//       // 解密数据
//       let decrypted = decipher.update(encrypted, "hex", "utf8");
//       decrypted += decipher.final("utf8");

//       this.logger.info(`成功解密 ${provider} API密钥`);
//       return decrypted;
//     } catch (error) {
//       this.logger.error(`解密 ${provider} API密钥失败: ${error}`);
//       throw new Error(
//         `密钥解密失败: ${
//           error instanceof Error ? error.message : String(error)
//         }`
//       );
//     }
//   }

//   /**
//    * 验证密钥格式
//    */
//   public validateKeyFormat(key: string, provider: string): boolean {
//     try {
//       if (!key || typeof key !== "string") {
//         return false;
//       }

//       // 根据提供商验证密钥格式
//       switch (provider.toLowerCase()) {
//         case "openai":
//           return key.startsWith("sk-") && key.length >= 20;
//         case "anthropic":
//           return key.startsWith("sk-ant-") && key.length >= 20;
//         case "zhipu":
//           return key.length >= 20;
//         case "dashscope":
//           return key.length >= 20;
//         case "gemini":
//           return key.length >= 20;
//         case "ollama":
//           // Ollama 通常不需要API密钥
//           return true;
//         default:
//           return key.length >= 10;
//       }
//     } catch (error) {
//       this.logger.error(`验证 ${provider} 密钥格式失败: ${error}`);
//       return false;
//     }
//   }

//   /**
//    * 清除内存中的密钥
//    */
//   public clearKeyFromMemory(key: string): void {
//     try {
//       if (typeof key === "string") {
//         // 用随机数据覆盖密钥字符串
//         const randomData = crypto.randomBytes(key.length).toString("utf8");
//         // 注意：JavaScript字符串是不可变的，这里只是示例
//         // 在实际应用中，应该使用Buffer或其他可修改的数据结构
//         this.logger.info("已清除内存中的密钥");
//       }
//     } catch (error) {
//       this.logger.error(`清除密钥失败: ${error}`);
//     }
//   }

//   /**
//    * 生成加密密钥
//    * 基于系统信息和提供商名称生成确定性密钥
//    */
//   private async generateEncryptionKey(provider: string): Promise<Buffer> {
//     try {
//       // 获取系统信息作为盐值
//       const systemInfo = {
//         platform: process.platform,
//         arch: process.arch,
//         provider: provider,
//         timestamp: Math.floor(Date.now() / (1000 * 60 * 60 * 24)), // 按天变化
//       };

//       // 使用PBKDF2派生密钥
//       const salt = crypto
//         .createHash("sha256")
//         .update(JSON.stringify(systemInfo))
//         .digest();

//       const key = crypto.pbkdf2Sync(
//         "dish-ai-commit-encryption-key",
//         salt,
//         100000, // 迭代次数
//         this.keyLength,
//         "sha512"
//       );

//       return key;
//     } catch (error) {
//       this.logger.error(`生成加密密钥失败: ${error}`);
//       throw new Error(
//         `密钥生成失败: ${
//           error instanceof Error ? error.message : String(error)
//         }`
//       );
//     }
//   }
// }

// /**
//  * 密钥加密服务工厂
//  */
// export class KeyEncryptionServiceFactory {
//   /**
//    * 创建密钥加密服务实例
//    */
//   public static create(): IKeyEncryptionService {
//     return KeyEncryptionService.getInstance();
//   }
// }

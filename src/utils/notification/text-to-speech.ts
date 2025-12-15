// The global declarations were conflicting with TypeScript's built-in DOM types.
// They have been removed to resolve the compilation errors.

/**
 * 文本转语音服务 (后端实现)
 * 使用系统命令进行文本转语音
 */
export class TextToSpeechService {
  private static instance: TextToSpeechService | undefined;
  private _enabled: boolean = false;

  private constructor() {
    // 这是一个后端服务，不应访问 `window` 对象。
  }

  public static getInstance(): TextToSpeechService {
    if (!TextToSpeechService.instance) {
      TextToSpeechService.instance = new TextToSpeechService();
    }
    return TextToSpeechService.instance;
  }

  /**
   * 设置是否启用 TTS
   */
  public setEnabled(enabled: boolean): void {
    this._enabled = enabled;
  }

  /**
   * 检查是否已启用
   */
  public isEnabled(): boolean {
    return this._enabled;
  }

  /**
   * 朗读文本
   * @param text 要朗读的文本
   * @param options 可选配置
   */
  public async speak(
    text: string,
    options?: {
      lang?: string;
      rate?: number;
      pitch?: number;
      volume?: number;
    }
  ): Promise<void> {
    if (!this._enabled || !text) {
      return;
    }

    // 这是一个后端服务，它使用系统命令来执行文本转语音。
    try {
      await this.speakUsingSystemCommand(text, options);
    } catch (error) {
      console.error("Text-to-speech error:", error);
      // 静默失败，不影响主流程
    }
  }

  /**
   * 使用系统命令进行 TTS（降级方案）
   */
  private async speakUsingSystemCommand(
    text: string,
    options?: {
      lang?: string;
      rate?: number;
      pitch?: number;
      volume?: number;
    }
  ): Promise<void> {
    const { exec } = require("child_process");
    const { promisify } = require("util");
    const execAsync = promisify(exec);

    const platform = process.platform;

    try {
      if (platform === "darwin") {
        // macOS 使用 `say` 命令
        const lang = options?.lang || "zh-CN";
        const rate = options?.rate || 200; // say 命令的 rate 是 0-500
        const adjustedRate = Math.max(0, Math.min(500, rate * 200));

        await execAsync(
          `say -r ${adjustedRate} "${text.replace(/"/g, '\\"')}"`
        );
      } else if (platform === "win32") {
        // Windows 使用 PowerShell 的 SpeechSynthesizer
        const escapedText = text.replace(/"/g, '""');
        const psCommand = `Add-Type -AssemblyName System.Speech; $speak = New-Object System.Speech.Synthesis.SpeechSynthesizer; $speak.Speak("${escapedText}")`;
        await execAsync(
          `powershell -Command "${psCommand.replace(/"/g, '\\"')}"`
        );
      } else if (platform === "linux") {
        // Linux 使用 `espeak` 或 `festival`（需要安装）
        // 尝试使用 espeak
        try {
          await execAsync(`espeak "${text.replace(/"/g, '\\"')}"`);
        } catch {
          // 如果 espeak 不可用，尝试 festival
          await execAsync(
            `echo "${text.replace(/"/g, '\\"')}" | festival --tts`
          );
        }
      }
    } catch (error) {
      console.warn("System TTS command failed:", error);
      // 静默失败
    }
  }

  /**
   * 停止当前朗读
   * 注意：在 Node.js 环境中，无法直接停止系统 TTS 进程
   */
  public stop(): void {
    // 在 Node.js 环境中，无法直接停止系统 TTS
    // 可以尝试终止进程，但这里不实现以避免复杂性
    console.log("TTS stop requested (not implemented for system TTS)");
  }

  /**
   * 检查是否正在朗读
   */
  public isSpeaking(): boolean {
    // 在 Node.js 环境中，无法准确判断系统 TTS 是否正在运行
    return false;
  }
}

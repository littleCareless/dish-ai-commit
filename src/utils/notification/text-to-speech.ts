import * as vscode from "vscode";

// The global declarations were conflicting with TypeScript's built-in DOM types.
// They have been removed to resolve the compilation errors.

/**
 * 文本转语音服务
 * 使用 Web Speech API 的 SpeechSynthesis 进行文本转语音
 */
export class TextToSpeechService {
  private static instance: TextToSpeechService | undefined;
  private _enabled: boolean = false;
  private _synth: SpeechSynthesis | undefined;

  private constructor() {
    // 在 Node.js 环境中，Web Speech API 不可用
    // 需要检查是否在浏览器环境中
    if (typeof window !== "undefined" && window.speechSynthesis) {
      this._synth = window.speechSynthesis;
    }
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

    // 在 VS Code 扩展环境中，无法直接使用 Web Speech API
    // 需要通过 webview 或者在用户的操作系统中使用系统 TTS
    // 这里我们提供一个降级方案：使用系统通知或 VS Code 通知
    try {
      // 在 VS Code 扩展环境中，无法直接使用 Web Speech API
      // 使用系统命令调用系统 TTS（如 macOS 的 `say` 命令）
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

        await execAsync(`say -r ${adjustedRate} "${text.replace(/"/g, '\\"')}"`);
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
          await execAsync(`echo "${text.replace(/"/g, '\\"')}" | festival --tts`);
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

/**
 * 在 webview 中执行 TTS 的辅助函数
 * 这个函数应该从 webview 中调用（在浏览器环境中）
 * 
 * 注意：这个函数需要在 webview 的 JavaScript 代码中使用，而不是在扩展后端
 */
export function speakInWebview(text: string, options?: {
  lang?: string;
  rate?: number;
  pitch?: number;
  volume?: number;
}): void {
  // 这个函数应该在 webview 的客户端代码中实现
  // 这里提供一个示例实现，但实际应该在 webview-ui 中调用
  if (typeof window === "undefined" || !window.speechSynthesis) {
    console.warn("SpeechSynthesis not available in this environment");
    return;
  }

  const synth = window.speechSynthesis;
  synth.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = options?.lang || "zh-CN";
  utterance.rate = options?.rate || 1.0;
  utterance.pitch = options?.pitch || 1.0;
  utterance.volume = options?.volume || 1.0;

  synth.speak(utterance);
}


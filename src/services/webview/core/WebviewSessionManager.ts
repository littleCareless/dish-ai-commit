/**
 * Webview Session Manager (后端)
 *
 * 负责：
 * 1. 验证和管理 Webview 会话
 * 2. 消息幂等性控制
 * 3. 消息去重
 * 4. 初始化操作锁管理
 */

import { WebviewPhase } from "@shared/types/sessions";

type MessageOperation<T> = () => Promise<T>;

class WebviewSessionManager {
  private static instance: WebviewSessionManager;
  private currentSessionId: string | null = null;
  private messageDeduplicator: MessageDeduplicator;
  private initLocks: Map<string, Promise<unknown>> = new Map();
  private phase: WebviewPhase = WebviewPhase.BOOT;
  private messagesProcessed: number = 0;
  private messagesDuplicated: number = 0;

  private constructor() {
    this.messageDeduplicator = new MessageDeduplicator(5000);
    console.log(
      "[ExtensionSessionManager] Backend session manager initialized",
    );
  }

  static getInstance(): WebviewSessionManager {
    if (!WebviewSessionManager.instance) {
      WebviewSessionManager.instance = new WebviewSessionManager();
    }
    return WebviewSessionManager.instance;
  }

  /**
   * 处理握手
   *
   * @param sessionId 客户端提供的 session ID
   * @returns 是否为新会话
   */
  handleHandshake(sessionId: string): boolean {
    if (this.currentSessionId === sessionId) {
      console.log(
        `[ExtensionSessionManager] Duplicate handshake for session ${sessionId}, ignoring`,
      );
      return false;
    }

    if (this.currentSessionId) {
      console.log(
        `[ExtensionSessionManager] New session ${sessionId} replacing old session ${this.currentSessionId}`,
      );
    }

    this.currentSessionId = sessionId;
    this.phase = WebviewPhase.HANDSHAKE;
    this.messageDeduplicator.clear();
    this.initLocks.clear();
    this.messagesProcessed = 0;
    this.messagesDuplicated = 0;

    console.log(
      `[ExtensionSessionManager] New session established: ${sessionId}`,
    );
    return true;
  }

  /**
   * 标记会话为就绪状态
   */
  markSessionReady(): void {
    if (!this.currentSessionId) {
      console.warn(
        "[ExtensionSessionManager] Cannot mark session ready: no session exists",
      );
      return;
    }

    this.phase = WebviewPhase.READY;
    console.log(
      `[ExtensionSessionManager] Session ${this.currentSessionId} marked as ready`,
    );
  }

  /**
   * 检查是否有活动会话
   */
  hasActiveSession(): boolean {
    return (
      this.currentSessionId !== null && this.phase !== WebviewPhase.TERMINATED
    );
  }

  /**
   * 获取当前会话 ID
   */
  getCurrentSessionId(): string | null {
    return this.currentSessionId;
  }

  /**
   * 幂等操作包装器
   *
   * @param messageId 消息唯一标识
   * @param operation 要执行的操作
   * @returns 操作结果
   */
  async withIdempotency<T>(
    messageId: string,
    operation: MessageOperation<T>,
  ): Promise<T> {
    if (!this.hasActiveSession()) {
      console.warn(
        "[ExtensionSessionManager] No active session, rejecting operation",
      );
      throw new Error("No active session");
    }

    if (this.messageDeduplicator.seen(messageId)) {
      this.messagesDuplicated++;
      console.log(
        `[ExtensionSessionManager] Message ${messageId} already processed, skipping (total duplicated: ${this.messagesDuplicated})`,
      );
      throw new Error("Message already processed");
    }

    if (this.initLocks.has(messageId)) {
      console.log(
        `[ExtensionSessionManager] Operation ${messageId} in progress, waiting...`,
      );
      return this.initLocks.get(messageId) as Promise<T>;
    }

    const startTime = Date.now();
    const promise = operation()
      .then((result) => {
        const duration = Date.now() - startTime;
        this.messageDeduplicator.markSeen(messageId);
        this.initLocks.delete(messageId);
        this.messagesProcessed++;

        console.log(
          `[ExtensionSessionManager] Operation ${messageId} completed in ${duration}ms (processed: ${this.messagesProcessed})`,
        );
        return result;
      })
      .catch((error) => {
        this.initLocks.delete(messageId);
        console.error(
          `[ExtensionSessionManager] Operation ${messageId} failed:`,
          error,
        );
        throw error;
      });

    this.initLocks.set(messageId, promise);
    return promise;
  }

  /**
   * 终止会话
   */
  terminateSession(): void {
    if (!this.currentSessionId) {
      return;
    }

    console.log(
      `[ExtensionSessionManager] Terminating session: ${this.currentSessionId}`,
    );

    this.phase = WebviewPhase.TERMINATED;
    this.currentSessionId = null;
    this.messageDeduplicator.clear();
    this.initLocks.clear();
  }

  /**
   * 获取会话统计信息
   */
  getStatistics() {
    return {
      sessionId: this.currentSessionId,
      phase: this.phase,
      messagesProcessed: this.messagesProcessed,
      messagesDuplicated: this.messagesDuplicated,
      pendingOperations: this.initLocks.size,
      deduplicatorSize: this.messageDeduplicator.size(),
    };
  }
}

/**
 * 消息去重器
 *
 * 基于时间窗口的消息去重，防止短时间内相同消息重复处理
 */
class MessageDeduplicator {
  private seenMessages: Map<string, number> = new Map();
  private windowSize: number;
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor(windowSize: number) {
    this.windowSize = windowSize;
    this.startCleanupTimer();
    console.log(
      `[MessageDeduplicator] Initialized with ${windowSize}ms window`,
    );
  }

  /**
   * 检查消息是否已处理
   */
  seen(messageId: string): boolean {
    return this.seenMessages.has(messageId);
  }

  /**
   * 标记消息为已处理
   */
  markSeen(messageId: string): void {
    this.seenMessages.set(messageId, Date.now());
  }

  /**
   * 清空所有记录
   */
  clear(): void {
    this.seenMessages.clear();
    console.log("[MessageDeduplicator] All messages cleared");
  }

  /**
   * 获取当前记录数
   */
  size(): number {
    return this.seenMessages.size;
  }

  /**
   * 清理过期记录
   */
  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [id, timestamp] of this.seenMessages.entries()) {
      if (now - timestamp > this.windowSize) {
        this.seenMessages.delete(id);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(
        `[MessageDeduplicator] Cleaned up ${cleaned} expired messages`,
      );
    }
  }

  /**
   * 启动定期清理定时器
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.windowSize / 2);

    // 确保定时器不会阻止进程退出
    if (this.cleanupTimer.unref) {
      this.cleanupTimer.unref();
    }
  }

  /**
   * 停止清理定时器
   */
  private stopCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }
}

export default WebviewSessionManager;

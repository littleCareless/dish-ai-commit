/**
 * Webview Session Manager (前端)
 *
 * 负责：
 * 1. 管理 Webview 会话生命周期
 * 2. 防止前端重复初始化服务
 * 3. 协调与 Extension 的握手
 * 4. 追踪已初始化的服务
 */

import {
  SessionEvent,
  SessionEventType,
  WebviewPhase,
  WebviewSession,
} from "@shared/types/sessions";

type EventHandlerEventHandler = (event: SessionEvent) => void;

class WebviewSessionManager {
  private static instance: WebviewSessionManager;
  private session: WebviewSession | null = null;
  private initPromises: Map<string, Promise<unknown>> = new Map();
  private eventHandlers: Set<EventHandlerEventHandler> = new Set();
  private handshakeComplete: boolean = false;

  private constructor() {
    console.log("[SessionManager] Frontend session manager initialized");
  }

  static getInstance(): WebviewSessionManager {
    if (!WebviewSessionManager.instance) {
      WebviewSessionManager.instance = new WebviewSessionManager();
    }
    return WebviewSessionManager.instance;
  }

  /**
   * 初始化会话
   */
  initSession(): WebviewSession {
    if (this.session && this.session.phase !== WebviewPhase.TERMINATED) {
      console.log(
        `[SessionManager] Session already exists: ${this.session.sessionId}`,
      );
      return this.session;
    }

    const sessionId = this.generateSessionId();
    this.session = {
      sessionId,
      phase: WebviewPhase.BOOT,
      initializedServices: new Set(),
      createdAt: Date.now(),
    };

    this.handshakeComplete = false;

    this.emitEvent({
      type: SessionEventType.SESSION_CREATED,
      sessionId,
      timestamp: Date.now(),
    });

    console.log(`[SessionManager] New session created: ${sessionId}`);
    return this.session;
  }

  /**
   * 获取当前会话
   */
  getSession(): WebviewSession | null {
    return this.session;
  }

  /**
   * 获取会话 ID
   */
  getSessionId(): string | null {
    return this.session?.sessionId || null;
  }

  /**
   * 检查握手是否完成
   */
  isHandshakeComplete(): boolean {
    return this.handshakeComplete;
  }

  /**
   * 标记握手完成
   */
  markHandshakeComplete(): void {
    if (!this.session) {
      console.warn(
        "[SessionManager] Cannot mark handshake complete: no session exists",
      );
      return;
    }

    if (this.session.sessionId !== WebviewPhase.HANDSHAKE) {
      console.warn(
        `[SessionManager] Cannot mark handshake complete: current phase is ${this.session.phase}`,
      );
      return;
    }

    this.session.phase = WebviewPhase.READY;
    this.handshakeComplete = true;

    this.emitEvent({
      type: SessionEventType.SESSION_READY,
      sessionId: this.session.sessionId,
      timestamp: Date.now(),
    });

    console.log(
      `[SessionManager] Handshake completed: ${this.session.sessionId}`,
    );
  }

  /**
   * 标记握手开始
   */
  markHandshakeStarted(): void {
    if (!this.session) {
      console.warn(
        "[SessionManager] Cannot mark handshake started: no session exists",
      );
      return;
    }

    this.session.phase = WebviewPhase.HANDSHAKE;

    this.emitEvent({
      type: SessionEventType.SESSION_HANDSHAKE,
      sessionId: this.session.sessionId,
      timestamp: Date.now(),
    });

    console.log(
      `[SessionManager] Handshake started: ${this.session.sessionId}`,
    );
  }

  /**
   * 确保服务只初始化一次
   *
   * @param serviceName 服务名称
   * @param initFn 初始化函数
   */
  async ensureInitialized<T>(
    serviceName: string,
    initFn: () => Promise<T>,
  ): Promise<T> {
    if (!this.session) {
      console.warn(
        `[SessionManager] No session exists, initializing service ${serviceName}`,
      );
      this.initSession();
    }

    if (this.session?.initializedServices.has(serviceName)) {
      console.log(
        `[SessionManager] Service ${serviceName} already initialized, skipping (total: ${this.session.initializedServices.size} services)`,
      );
      return undefined as T;
    }

    if (this.initPromises.has(serviceName)) {
      console.log(
        `[SessionManager] Service ${serviceName} initialization in progress, waiting...`,
      );
      return this.initPromises.get(serviceName) as Promise<T>;
    }

    const startTime = Date.now();
    const promise = initFn()
      .then((result) => {
        const duration = Date.now() - startTime;
        this.session!.initializedServices.add(serviceName);
        this.initPromises.delete(serviceName);

        this.emitEvent({
          type: SessionEventType.SERVICE_INITIALIZED,
          sessionId: this.session!.sessionId,
          timestamp: Date.now(),
          data: { serviceName, duration },
        });

        console.log(
          `[SessionManager] Service ${serviceName} initialized in ${duration}ms (total: ${this.session!.initializedServices.size} services)`,
        );
        return result;
      })
      .catch((error) => {
        this.initPromises.delete(serviceName);
        console.error(
          `[SessionManager] Failed to initialize service ${serviceName}:`,
          error,
        );
        throw error;
      });

    this.initPromises.set(serviceName, promise);
    return promise;
  }

  /**
   * 终止会话
   */
  terminateSession(): void {
    if (!this.session) {
      return;
    }

    this.session.phase = WebviewPhase.TERMINATED;

    this.emitEvent({
      type: SessionEventType.SESSION_TERMINATED,
      sessionId: this.session.sessionId,
      timestamp: Date.now(),
    });

    console.log(
      `[SessionManager] Session terminated: ${this.session.sessionId}`,
    );

    this.session = null;
    this.handshakeComplete = false;
    this.initPromises.clear();
  }

  /**
   * 注册事件处理器
   */
  onEvent(handler: EventHandlerEventHandler): void {
    this.eventHandlers.add(handler);
  }

  /**
   * 移除事件处理器
   */
  offEvent(handler: EventHandlerEventHandler): void {
    this.eventHandlers.delete(handler);
  }

  /**
   * 获取会话统计信息
   */
  getStatistics() {
    if (!this.session) {
      return null;
    }

    return {
      sessionId: this.session.sessionId,
      phase: this.session.phase,
      uptime: Date.now() - this.session.createdAt,
      servicesInitialized: this.session.initializedServices.size,
      servicesList: Array.from(this.session.initializedServices),
      handshakeComplete: this.handshakeComplete,
    };
  }

  private emitEvent(event: SessionEvent): void {
    this.eventHandlers.forEach((handler) => {
      try {
        handler(event);
      } catch (error) {
        console.error("[SessionManager] Error in event handler:", error);
      }
    });
  }

  private generateSessionId(): string {
    return `webview-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }
}

export default WebviewSessionManager;

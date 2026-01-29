// ============================================================================
// Session Types for Webview Communication
// 会话管理类型定义，用于防止消息重复执行
// ============================================================================

/**
 * Webview 会话阶段枚举
 *
 * BOOT: 初始加载阶段，webview 刚创建
 * HANDSHAKE: 握手中阶段，正在与 extension 建立会话
 * READY: 已就绪阶段，可以处理业务消息
 * TERMINATED: 已终止阶段，webview 已被销毁
 */
export enum WebviewPhase {
  BOOT = "boot",
  HANDSHAKE = "handshake",
  READY = "ready",
  TERMINATED = "terminated",
}

/**
 * Webview 会话信息
 *
 * sessionId: 唯一会话标识符
 * phase: 当前会话阶段
 * initializedServices: 已初始化的服务名称集合
 * createdAt: 会话创建时间
 */
export interface WebviewSession {
  sessionId: string;
  phase: WebviewPhase;
  initializedServices: Set<string>;
  createdAt: number;
}

/**
 * 握手消息结构 (Webview → Extension)
 *
 * sessionId: 唯一会话标识符
 * timestamp: 时间戳
 * capabilities: 前端能力列表（可扩展）
 */
export interface HandshakeMessage {
  sessionId: string;
  timestamp: number;
  capabilities: string[];
}

/**
 * 握手确认消息结构 (Extension → Webview)
 *
 * sessionId: 确认的会话标识符
 * timestamp: 响应时间戳
 * success: 是否成功
 */
export interface HandshakeAckMessage {
  sessionId: string;
  timestamp: number;
  success: boolean;
}

/**
 * 消息去重信息
 *
 * messageId: 消息唯一标识
 * timestamp: 消息时间戳
 * sessionId: 关联的会话 ID
 */
export interface MessageDeduplicationInfo {
  messageId: string;
  timestamp: number;
  sessionId: string;
}

/**
 * 服务初始化状态
 *
 * serviceName: 服务名称
 * initialized: 是否已初始化
 * timestamp: 初始化时间戳
 * error: 错误信息（如果有）
 */
export interface ServiceInitializationStatus {
  serviceName: string;
  initialized: boolean;
  timestamp?: number;
  error?: string;
}

/**
 * 会话统计信息
 *
 * sessionId: 会话 ID
 * phase: 当前阶段
 * uptime: 运行时长（毫秒）
 * messagesProcessed: 已处理的消息数
 * messagesDuplicated: 被去重的消息数
 * servicesInitialized: 已初始化的服务数
 */
export interface SessionStatistics {
  sessionId: string;
  phase: WebviewPhase;
  uptime: number;
  messagesProcessed: number;
  messagesDuplicated: number;
  servicesInitialized: number;
}

// ============================================================================
// Session Lifecycle Events
// ============================================================================

/**
 * 会话事件类型
 */
export enum SessionEventType {
  SESSION_CREATED = "session.created",
  SESSION_HANDSHAKE = "session.handshake",
  SESSION_READY = "session.ready",
  SESSION_TERMINATED = "session.terminated",
  SERVICE_INITIALIZED = "service.initialized",
  MESSAGE_DUPLICATED = "message.duplicated",
  MESSAGE_PROCESSED = "message.processed",
}

/**
 * 会话事件
 */
export interface SessionEvent {
  type: SessionEventType;
  sessionId: string;
  timestamp: number;
  data?: Record<string, unknown>;
}

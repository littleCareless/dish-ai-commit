/**
 * 操作阶段枚举 - 用于长时间操作的进度显示
 */
export enum OperationStage {
  /** 初始化 */
  INITIALIZING = "initializing",
  /** 分析变更 */
  ANALYZING = "analyzing",
  /** 构建上下文 */
  BUILDING_CONTEXT = "building_context",
  /** 生成中 */
  GENERATING = "generating",
  /** 完成 */
  COMPLETED = "completed",
  /** 失败 */
  FAILED = "failed",
}

/**
 * 阶段元数据
 */
export interface OperationStageMetadata {
  id: OperationStage;
  labelKey: string;
  descriptionKey: string;
  order: number;
}

/**
 * 提交消息生成的阶段定义
 */
export const COMMIT_GENERATION_STAGES: OperationStageMetadata[] = [
  {
    id: OperationStage.INITIALIZING,
    labelKey: "stage.initializing",
    descriptionKey: "stage.initializing.description",
    order: 0,
  },
  {
    id: OperationStage.ANALYZING,
    labelKey: "stage.analyzing",
    descriptionKey: "stage.analyzing.description",
    order: 1,
  },
  {
    id: OperationStage.BUILDING_CONTEXT,
    labelKey: "stage.buildingContext",
    descriptionKey: "stage.buildingContext.description",
    order: 2,
  },
  {
    id: OperationStage.GENERATING,
    labelKey: "stage.generating",
    descriptionKey: "stage.generating.description",
    order: 3,
  },
  {
    id: OperationStage.COMPLETED,
    labelKey: "stage.completed",
    descriptionKey: "stage.completed.description",
    order: 4,
  },
];

/**
 * 索引操作的阶段定义
 */
export const INDEXING_STAGES: OperationStageMetadata[] = [
  {
    id: OperationStage.INITIALIZING,
    labelKey: "indexing.stage.initializing",
    descriptionKey: "indexing.stage.initializing.description",
    order: 0,
  },
  {
    id: OperationStage.ANALYZING,
    labelKey: "indexing.stage.scanning",
    descriptionKey: "indexing.stage.scanning.description",
    order: 1,
  },
  {
    id: OperationStage.GENERATING,
    labelKey: "indexing.stage.embedding",
    descriptionKey: "indexing.stage.embedding.description",
    order: 2,
  },
  {
    id: OperationStage.COMPLETED,
    labelKey: "indexing.stage.completed",
    descriptionKey: "indexing.stage.completed.description",
    order: 3,
  },
];

/**
 * 操作进度事件
 */
export interface OperationProgressEvent {
  /** 操作 ID */
  operationId: string;
  /** 操作类型 */
  operationType:
    | "commit-generation"
    | "indexing"
    | "weekly-report"
    | "code-review";
  /** 当前阶段 */
  stage: OperationStage;
  /** 阶段内进度 (0-100) */
  progress?: number;
  /** 附加消息 */
  message?: string;
  /** 当前处理项 */
  currentItem?: string;
  /** 总数 */
  total?: number;
  /** 已完成数 */
  completed?: number;
  /** 时间戳 */
  timestamp: number;
}

/**
 * 获取阶段索引
 */
export function getStageIndex(
  stages: OperationStageMetadata[],
  stageId: OperationStage,
): number {
  return stages.findIndex((s) => s.id === stageId);
}

/**
 * 获取阶段元数据
 */
export function getStageMetadata(
  stages: OperationStageMetadata[],
  stageId: OperationStage,
): OperationStageMetadata | undefined {
  return stages.find((s) => s.id === stageId);
}

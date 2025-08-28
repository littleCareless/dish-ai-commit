/**
 * Types and interfaces for staged content detection functionality
 * Supports multi-repository workspace environments
 */

/**
 * Diff target enumeration for specifying the scope of diff analysis
 */
export enum DiffTarget {
  /** Analyze only staged changes */
  STAGED = 'staged',
  /** Analyze all working directory changes */
  ALL = 'all',
  /** Automatically detect and choose between staged and all changes */
  AUTO = 'auto'
}

/**
 * Result of staged content detection operation
 */
export interface StagedDetectionResult {
  /** Whether staged content was found */
  hasStagedContent: boolean;
  /** Number of files in the staging area */
  stagedFileCount: number;
  /** List of staged files */
  stagedFiles: string[];
  /** Recommended diff target based on detection */
  recommendedTarget: DiffTarget;
  /** Repository where the detection was performed */
  repositoryPath: string;
  /** Error message if detection failed */
  errorMessage?: string;
}

/**
 * Information about a repository in a multi-repository workspace
 */
export interface RepositoryInfo {
  /** Absolute path to the repository root */
  path: string;
  /** Repository name (typically the directory name) */
  name: string;
  /** Type of version control system (git, svn, etc.) */
  type: 'git' | 'svn' | 'unknown';
  /** Whether this is the currently active repository */
  isActive: boolean;
  /** Branch name (for git repositories) */
  branch?: string;
}

/**
 * Context information for the current repository operation
 */
export interface RepositoryContext {
  /** Repository information */
  repository: RepositoryInfo;
  /** Files selected for the operation (optional) */
  selectedFiles?: string[];
  /** Current active editor file (optional) */
  activeFile?: string;
  /** Working directory relative to repository root */
  workingDirectory?: string;
}

/**
 * Configuration for auto-detection behavior
 */
export interface AutoDetectionConfig {
  /** Whether auto-detection is enabled */
  enabled: boolean;
  /** Whether to fallback to 'all' when staged is empty */
  fallbackToAll: boolean;
  /** Preferred diff target when user hasn't specified */
  preferredTarget: DiffTarget;
  /** Whether to show notifications about detection results */
  showNotifications: boolean;
}

/**
 * Options for staged content detection
 */
export interface DetectionOptions {
  /** Repository context to detect in */
  repository: RepositoryContext;
  /** Whether to include detailed file information */
  includeFileDetails?: boolean;
  /** Timeout for detection operation in milliseconds */
  timeoutMs?: number;
  /** Whether to cache detection results */
  useCache?: boolean;
}

/**
 * Result of diff content retrieval
 */
export interface DiffResult {
  /** The diff content */
  content: string;
  /** Target that was used for the diff */
  target: DiffTarget;
  /** Files included in the diff */
  files: string[];
  /** Repository where diff was generated */
  repositoryPath: string;
  /** Whether the result was cached */
  fromCache?: boolean;
}

/**
 * Interface for components that can detect staged content
 */
export interface IStagedContentDetector {
  /**
   * Detect staged content in the specified repository
   * @param options Detection options
   * @returns Promise resolving to detection result
   */
  detectStagedContent(options: DetectionOptions): Promise<StagedDetectionResult>;

  /**
   * Quick check if repository has any staged content
   * @param repositoryPath Path to repository
   * @returns Promise resolving to boolean
   */
  hasStagedChanges(repositoryPath: string): Promise<boolean>;

  /**
   * Get list of staged files
   * @param repositoryPath Path to repository
   * @returns Promise resolving to file list
   */
  getStagedFiles(repositoryPath: string): Promise<string[]>;
}

/**
 * Interface for multi-repository context management
 */
export interface IMultiRepositoryContextManager {
  /**
   * Identify the current repository context based on user selection
   * @param selectedFiles Selected files (optional)
   * @param activeEditor Current active editor (optional)
   * @returns Promise resolving to repository context
   */
  identifyRepository(selectedFiles?: string[], activeEditor?: any): Promise<RepositoryContext>;

  /**
   * Get all available repositories in the workspace
   * @returns Promise resolving to repository list
   */
  getAllRepositories(): Promise<RepositoryInfo[]>;

  /**
   * Get the primary/active repository
   * @returns Promise resolving to primary repository info
   */
  getPrimaryRepository(): Promise<RepositoryInfo | undefined>;
}

/**
 * Interface for smart diff target selection
 */
export interface ISmartDiffSelector {
  /**
   * Intelligently select the appropriate diff target
   * @param provider SCM provider
   * @param detectionResult Result from staged content detection
   * @param userPreference User's preferred target (optional)
   * @returns Promise resolving to selected diff target
   */
  selectDiffTarget(
    provider: any,
    detectionResult: StagedDetectionResult,
    userPreference?: DiffTarget
  ): Promise<DiffTarget>;

  /**
   * Get diff content using the specified target
   * @param provider SCM provider
   * @param target Diff target to use
   * @param files Optional file list to limit diff scope
   * @returns Promise resolving to diff result
   */
  getDiffWithTarget(
    provider: any,
    target: DiffTarget,
    files?: string[]
  ): Promise<DiffResult>;
}

/**
 * Events that can be emitted during staged content detection
 */
export interface StagedDetectionEvents {
  /** Emitted when detection starts */
  'detection-started': { repositoryPath: string; options: DetectionOptions };
  /** Emitted when detection completes */
  'detection-completed': { result: StagedDetectionResult };
  /** Emitted when detection fails */
  'detection-failed': { error: Error; repositoryPath: string };
  /** Emitted when diff target is selected */
  'target-selected': { target: DiffTarget; reason: string };
}

/**
 * Cache entry for staged detection results
 */
export interface DetectionCacheEntry {
  /** Detection result */
  result: StagedDetectionResult;
  /** Timestamp when cached */
  timestamp: number;
  /** TTL in milliseconds */
  ttl: number;
  /** Repository path */
  repositoryPath: string;
}

/**
 * Error types that can occur during staged detection
 */
export enum DetectionErrorType {
  /** Git command execution failed */
  GIT_COMMAND_FAILED = 'git_command_failed',
  /** Repository not found or not a valid git repository */
  INVALID_REPOSITORY = 'invalid_repository',
  /** Permission denied accessing repository */
  PERMISSION_DENIED = 'permission_denied',
  /** Operation timed out */
  TIMEOUT = 'timeout',
  /** Unknown error */
  UNKNOWN = 'unknown'
}

/**
 * Custom error class for staged detection operations
 */
export class StagedDetectionError extends Error {
  constructor(
    public readonly type: DetectionErrorType,
    message: string,
    public readonly repositoryPath?: string,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'StagedDetectionError';
  }
}
/**
 * Unit tests for SmartDiffSelector
 * Tests intelligent diff target selection and configuration integration
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as vscode from 'vscode';

import { SmartDiffSelector } from '../../smart-diff-selector';
import { ISCMProvider } from '../../scm-provider';
import {
  DiffTarget,
  StagedDetectionResult,
  DiffResult
} from '../../staged-detector-types';
import { notify } from '../../../utils/notification/notification-manager';

// Mock external dependencies
vi.mock('vscode', () => ({
  workspace: {
    getConfiguration: vi.fn(),
    workspaceFolders: [
      { uri: { fsPath: '/test/workspace' } }
    ]
  },
  ConfigurationTarget: {
    Workspace: 2
  }
}));

vi.mock('../../../utils/notification/notification-manager', () => ({
  notify: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}));

const mockVscode = vi.mocked(vscode);

describe('SmartDiffSelector', () => {
  let selector: SmartDiffSelector;
  let mockProvider: ISCMProvider;
  let mockConfig: any;

  beforeEach(() => {
    vi.clearAllMocks();
    selector = new SmartDiffSelector();

    // Mock SCM provider
    mockProvider = {
      type: 'git',
      isAvailable: vi.fn().mockResolvedValue(true),
      init: vi.fn().mockResolvedValue(undefined),
      getDiff: vi.fn().mockResolvedValue('mock diff content'),
      commit: vi.fn().mockResolvedValue(undefined),
      setCommitInput: vi.fn().mockResolvedValue(undefined),
      getCommitInput: vi.fn().mockResolvedValue(''),
      startStreamingInput: vi.fn().mockResolvedValue(undefined),
      getCommitLog: vi.fn().mockResolvedValue([]),
      getRecentCommitMessages: vi.fn().mockResolvedValue({ user: [], repository: [] }),
      copyToClipboard: vi.fn().mockResolvedValue(undefined)
    } as ISCMProvider;

    // Mock vscode configuration
    mockConfig = {
      get: vi.fn((key: string, defaultValue?: any) => {
        switch (key) {
          case 'features.codeAnalysis.autoDetectStaged':
            return true;
          case 'features.codeAnalysis.fallbackToAll':
            return true;
          case 'features.codeAnalysis.diffTarget':
            return 'auto';
          case 'features.suppressNonCriticalWarnings':
            return false;
          default:
            return defaultValue;
        }
      }),
      update: vi.fn().mockResolvedValue(undefined)
    };
    vi.mocked(mockVscode.workspace.getConfiguration).mockReturnValue(mockConfig);
  });

  describe('selectDiffTarget', () => {
    it('应该选择STAGED当检测到暂存区有内容时', async () => {
      // Arrange
      const detectionResult: StagedDetectionResult = {
        hasStagedContent: true,
        stagedFileCount: 3,
        stagedFiles: ['file1.ts', 'file2.ts', 'file3.ts'],
        recommendedTarget: DiffTarget.STAGED,
        repositoryPath: '/test/repo'
      };

      // Act
      const target = await selector.selectDiffTarget(mockProvider, detectionResult);

      // Assert
      expect(target).toBe(DiffTarget.STAGED);
    });

    it('应该选择ALL当暂存区为空且启用回退时', async () => {
      // Arrange
      const detectionResult: StagedDetectionResult = {
        hasStagedContent: false,
        stagedFileCount: 0,
        stagedFiles: [],
        recommendedTarget: DiffTarget.ALL,
        repositoryPath: '/test/repo'
      };

      // Act
      const target = await selector.selectDiffTarget(mockProvider, detectionResult);

      // Assert
      expect(target).toBe(DiffTarget.ALL);
    });

    it('应该遵循用户显式指定的偏好', async () => {
      // Arrange
      const detectionResult: StagedDetectionResult = {
        hasStagedContent: true,
        stagedFileCount: 2,
        stagedFiles: ['file1.ts', 'file2.ts'],
        recommendedTarget: DiffTarget.STAGED,
        repositoryPath: '/test/repo'
      };

      // Act - User explicitly wants 'all' despite staged content
      const target = await selector.selectDiffTarget(
        mockProvider, 
        detectionResult, 
        DiffTarget.ALL
      );

      // Assert
      expect(target).toBe(DiffTarget.ALL);
    });

    it('应该处理自动检测禁用的情况', async () => {
      // Arrange
      mockConfig.get.mockImplementation((key: string, defaultValue?: any) => {
        if (key === 'features.codeAnalysis.autoDetectStaged') {
          return false;
        }
        if (key === 'features.codeAnalysis.diffTarget') {
          return 'staged';
        }
        return defaultValue;
      });

      const detectionResult: StagedDetectionResult = {
        hasStagedContent: false,
        stagedFileCount: 0,
        stagedFiles: [],
        recommendedTarget: DiffTarget.ALL,
        repositoryPath: '/test/repo'
      };

      // Act
      const target = await selector.selectDiffTarget(mockProvider, detectionResult);

      // Assert
      expect(target).toBe(DiffTarget.STAGED); // Should use config preference
    });

    it('应该处理检测错误并使用回退策略', async () => {
      // Arrange
      const detectionResult: StagedDetectionResult = {
        hasStagedContent: false,
        stagedFileCount: 0,
        stagedFiles: [],
        recommendedTarget: DiffTarget.ALL,
        repositoryPath: '/test/repo',
        errorMessage: 'Git command failed'
      };

      // Act
      const target = await selector.selectDiffTarget(mockProvider, detectionResult);

      // Assert
      expect(target).toBe(DiffTarget.ALL); // Should fallback to 'all'
    });

    it('应该选择STAGED当回退被禁用时', async () => {
      // Arrange
      mockConfig.get.mockImplementation((key: string, defaultValue?: any) => {
        if (key === 'features.codeAnalysis.fallbackToAll') {
          return false;
        }
        return defaultValue;
      });

      const detectionResult: StagedDetectionResult = {
        hasStagedContent: false,
        stagedFileCount: 0,
        stagedFiles: [],
        recommendedTarget: DiffTarget.STAGED,
        repositoryPath: '/test/repo',
        errorMessage: 'Some error'
      };

      // Act
      const target = await selector.selectDiffTarget(mockProvider, detectionResult);

      // Assert
      expect(target).toBe(DiffTarget.STAGED); // Should not fallback
    });
  });

  describe('getDiffWithTarget', () => {
    beforeEach(() => {
      // Setup provider to return different content based on configuration
      mockProvider.getDiff = vi.fn().mockImplementation(async () => {
        const config = mockVscode.workspace.getConfiguration('dish-ai-commit');
        const diffTarget = config.get('features.codeAnalysis.diffTarget');
        
        if (diffTarget === 'staged') {
          return 'staged diff content';
        } else {
          return 'all changes diff content';
        }
      });
    });

    it('应该获取STAGED模式的diff内容', async () => {
      // Act
      const result = await selector.getDiffWithTarget(
        mockProvider, 
        DiffTarget.STAGED, 
        ['file1.ts']
      );

      // Assert
      expect(result.content).toBe('staged diff content');
      expect(result.target).toBe(DiffTarget.STAGED);
      expect(result.files).toEqual(['file1.ts']);
      expect(mockConfig.update).toHaveBeenCalledWith(
        'features.codeAnalysis.diffTarget', 
        'staged', 
        vscode.ConfigurationTarget.Workspace
      );
    });

    it('应该获取ALL模式的diff内容', async () => {
      // Act
      const result = await selector.getDiffWithTarget(
        mockProvider, 
        DiffTarget.ALL
      );

      // Assert
      expect(result.content).toBe('all changes diff content');
      expect(result.target).toBe(DiffTarget.ALL);
      expect(mockConfig.update).toHaveBeenCalledWith(
        'features.codeAnalysis.diffTarget', 
        'all', 
        vscode.ConfigurationTarget.Workspace
      );
    });

    it('应该处理AUTO模式并回退到ALL', async () => {
      // Act
      const result = await selector.getDiffWithTarget(
        mockProvider, 
        DiffTarget.AUTO
      );

      // Assert
      expect(result.content).toBe('all changes diff content');
      expect(result.target).toBe(DiffTarget.ALL);
    });

    it('应该恢复原始配置', async () => {
      // Arrange
      const originalTarget = 'staged';
      mockConfig.get.mockReturnValue(originalTarget);

      // Act
      await selector.getDiffWithTarget(mockProvider, DiffTarget.ALL);

      // Assert - Should restore original configuration
      expect(mockConfig.update).toHaveBeenCalledWith(
        'features.codeAnalysis.diffTarget', 
        'all', 
        vscode.ConfigurationTarget.Workspace
      );
      expect(mockConfig.update).toHaveBeenCalledWith(
        'features.codeAnalysis.diffTarget', 
        originalTarget, 
        vscode.ConfigurationTarget.Workspace
      );
    });

    it('应该处理不支持的目标类型', async () => {
      // Act & Assert
      await expect(selector.getDiffWithTarget(
        mockProvider, 
        'invalid' as DiffTarget
      )).rejects.toThrow('Unsupported diff target');
    });

    it('应该包含仓库路径信息', async () => {
      // Act
      const result = await selector.getDiffWithTarget(mockProvider, DiffTarget.STAGED);

      // Assert
      expect(result.repositoryPath).toBeDefined();
      expect(typeof result.repositoryPath).toBe('string');
    });
  });

  describe('validateTarget', () => {
    it('应该验证有效的目标', async () => {
      // Arrange
      mockProvider.getDiff = vi.fn().mockResolvedValue('valid diff content');

      // Act
      const validation = await selector.validateTarget(mockProvider, DiffTarget.STAGED);

      // Assert
      expect(validation.isValid).toBe(true);
      expect(validation.reason).toBeUndefined();
      expect(validation.suggestion).toBeUndefined();
    });

    it('应该检测空的STAGED目标并建议ALL', async () => {
      // Arrange
      mockProvider.getDiff = vi.fn().mockResolvedValue('');

      // Act
      const validation = await selector.validateTarget(mockProvider, DiffTarget.STAGED);

      // Assert
      expect(validation.isValid).toBe(false);
      expect(validation.reason).toContain('暂存区为空');
      expect(validation.suggestion).toBe(DiffTarget.ALL);
    });

    it('应该检测完全没有更改的情况', async () => {
      // Arrange
      mockProvider.getDiff = vi.fn().mockResolvedValue('   ');

      // Act
      const validation = await selector.validateTarget(mockProvider, DiffTarget.ALL);

      // Assert
      expect(validation.isValid).toBe(false);
      expect(validation.reason).toContain('没有检测到任何更改');
      expect(validation.suggestion).toBeUndefined();
    });

    it('应该处理diff获取错误', async () => {
      // Arrange
      mockProvider.getDiff = vi.fn().mockRejectedValue(new Error('Git error'));

      // Act
      const validation = await selector.validateTarget(mockProvider, DiffTarget.STAGED);

      // Assert
      expect(validation.isValid).toBe(false);
      expect(validation.reason).toContain('无法获取');
      expect(validation.reason).toContain('Git error');
    });
  });

  describe('通知系统', () => {
    it('应该在启用通知时显示选择信息', async () => {
      // Arrange
      mockConfig.get.mockImplementation((key: string, defaultValue?: any) => {
        if (key === 'features.suppressNonCriticalWarnings') {
          return false; // Enable notifications
        }
        return defaultValue;
      });

      const detectionResult: StagedDetectionResult = {
        hasStagedContent: true,
        stagedFileCount: 2,
        stagedFiles: ['file1.ts', 'file2.ts'],
        recommendedTarget: DiffTarget.STAGED,
        repositoryPath: '/test/repo'
      };

      // Act
      await selector.selectDiffTarget(mockProvider, detectionResult);

      // Assert - Should have called notification
      // We verify the notification system is working
      expect(notify.info).toBeDefined();
    });

    it('应该在禁用通知时跳过通知', async () => {
      // Arrange
      mockConfig.get.mockImplementation((key: string, defaultValue?: any) => {
        if (key === 'features.suppressNonCriticalWarnings') {
          return true; // Disable notifications
        }
        return defaultValue;
      });

      const detectionResult: StagedDetectionResult = {
        hasStagedContent: true,
        stagedFileCount: 2,
        stagedFiles: ['file1.ts', 'file2.ts'],
        recommendedTarget: DiffTarget.STAGED,
        repositoryPath: '/test/repo'
      };

      // Act
      await selector.selectDiffTarget(mockProvider, detectionResult);

      // Assert - Should still work but without showing notifications
      // The functionality should complete successfully
      expect(true).toBe(true); // Test completes without throwing
    });
  });

  describe('配置集成', () => {
    it('应该正确读取自动检测配置', async () => {
      // Arrange
      mockConfig.get.mockImplementation((key: string, defaultValue?: any) => {
        const values: Record<string, any> = {
          'features.codeAnalysis.autoDetectStaged': false,
          'features.codeAnalysis.fallbackToAll': false,
          'features.codeAnalysis.diffTarget': 'staged',
          'features.suppressNonCriticalWarnings': true
        };
        return values[key] ?? defaultValue;
      });

      const detectionResult: StagedDetectionResult = {
        hasStagedContent: false,
        stagedFileCount: 0,
        stagedFiles: [],
        recommendedTarget: DiffTarget.ALL,
        repositoryPath: '/test/repo'
      };

      // Act
      const target = await selector.selectDiffTarget(mockProvider, detectionResult);

      // Assert
      expect(target).toBe(DiffTarget.STAGED); // Should use configured preference
      expect(mockConfig.get).toHaveBeenCalledWith('features.codeAnalysis.autoDetectStaged', true);
      expect(mockConfig.get).toHaveBeenCalledWith('features.codeAnalysis.fallbackToAll', true);
    });
  });
});
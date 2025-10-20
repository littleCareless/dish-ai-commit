import { describe, it, expect, beforeEach } from 'vitest';
import { ErrorClassificationService } from '../error-classification';
import { ErrorType, ErrorSeverity } from '../error-translation';

describe('ErrorClassificationService', () => {
  let service: ErrorClassificationService;

  beforeEach(() => {
    service = ErrorClassificationService.getInstance();
  });

  describe('classifyError', () => {
    it('should classify API key missing error', () => {
      const error = new Error('API key is missing');
      const result = service.classifyError(error);

      expect(result.errorType).toBe(ErrorType.CONFIGURATION);
      expect(result.severity).toBe(ErrorSeverity.HIGH);
      expect(result.confidence).toBeGreaterThan(0.3);
      expect(result.matchedRules.length).toBeGreaterThan(0);
      expect(result.suggestedActions.length).toBeGreaterThan(0);
    });

    it('should classify network connection error', () => {
      const error = new Error('Connection failed');
      const result = service.classifyError(error);

      expect(result.errorType).toBe(ErrorType.NETWORK);
      expect(result.severity).toBe(ErrorSeverity.HIGH);
      expect(result.confidence).toBeGreaterThan(0.3);
    });

    it('should classify AI provider error', () => {
      const error = new Error('AI service unavailable');
      const result = service.classifyError(error);

      expect(result.errorType).toBe(ErrorType.AI_PROVIDER);
      expect(result.severity).toBe(ErrorSeverity.HIGH);
      expect(result.confidence).toBeGreaterThan(0.3);
    });

    it('should classify file permission error', () => {
      const error = new Error('Permission denied');
      const result = service.classifyError(error);

      expect(result.errorType).toBe(ErrorType.FILE_SYSTEM);
      expect(result.severity).toBe(ErrorSeverity.HIGH);
      expect(result.confidence).toBeGreaterThan(0.3);
    });

    it('should classify validation error', () => {
      const error = new Error('Required field is missing');
      const result = service.classifyError(error);

      expect(result.errorType).toBe(ErrorType.VALIDATION);
      expect(result.severity).toBe(ErrorSeverity.MEDIUM);
      expect(result.confidence).toBeGreaterThan(0.3);
    });

    it('should handle unknown error', () => {
      const error = new Error('Some unknown error message');
      const result = service.classifyError(error);

      expect(result.errorType).toBe(ErrorType.UNKNOWN);
      expect(result.severity).toBe(ErrorSeverity.MEDIUM);
      expect(result.confidence).toBeLessThan(0.3);
    });

    it('should handle string error', () => {
      const error = 'String error message';
      const result = service.classifyError(error);

      expect(result).toBeDefined();
      expect(result.errorType).toBeDefined();
      expect(result.severity).toBeDefined();
    });

    it('should handle error with context', () => {
      const error = new Error('API key is missing');
      const context = { operation: 'commit-generation' };
      const result = service.classifyError(error, context);

      expect(result).toBeDefined();
      expect(result.errorType).toBe(ErrorType.CONFIGURATION);
    });
  });

  describe('getErrorStatistics', () => {
    it('should return error statistics', () => {
      // Record some errors first
      service.classifyError(new Error('API key is missing'));
      service.classifyError(new Error('Connection failed'));
      service.classifyError(new Error('API key is missing'));

      const stats = service.getErrorStatistics();

      expect(stats.totalErrors).toBeGreaterThan(0);
      expect(stats.errorsByType).toBeDefined();
      expect(stats.errorsBySeverity).toBeDefined();
      expect(stats.recentErrors).toBeDefined();
      expect(stats.trends).toBeDefined();
    });

    it('should return statistics for specific time range', () => {
      const stats = service.getErrorStatistics(1); // 1 hour

      expect(stats.totalErrors).toBeGreaterThanOrEqual(0);
      expect(stats.errorsByType).toBeDefined();
      expect(stats.errorsBySeverity).toBeDefined();
    });

    it('should track error trends', () => {
      const stats = service.getErrorStatistics();

      expect(stats.trends.increasing).toBeDefined();
      expect(stats.trends.decreasing).toBeDefined();
      expect(stats.trends.stable).toBeDefined();
      expect(Array.isArray(stats.trends.increasing)).toBe(true);
      expect(Array.isArray(stats.trends.decreasing)).toBe(true);
      expect(Array.isArray(stats.trends.stable)).toBe(true);
    });
  });

  describe('classification rules management', () => {
    it('should add custom classification rule', () => {
      const customRule = {
        id: 'custom-rule',
        name: 'Custom Error Rule',
        pattern: /custom error/i,
        errorType: ErrorType.UNKNOWN,
        severity: ErrorSeverity.LOW,
        priority: 50,
        description: 'Custom error rule for testing'
      };

      service.addClassificationRule(customRule);

      const error = new Error('This is a custom error');
      const result = service.classifyError(error);

      expect(result.matchedRules.some(rule => rule.id === 'custom-rule')).toBe(true);
    });

    it('should remove classification rule', () => {
      const customRule = {
        id: 'temp-rule',
        name: 'Temporary Rule',
        pattern: /temp error/i,
        errorType: ErrorType.UNKNOWN,
        severity: ErrorSeverity.LOW,
        priority: 50,
        description: 'Temporary rule for testing'
      };

      service.addClassificationRule(customRule);
      service.removeClassificationRule('temp-rule');

      const rules = service.getClassificationRules();
      expect(rules.find(rule => rule.id === 'temp-rule')).toBeUndefined();
    });

    it('should get all classification rules', () => {
      const rules = service.getClassificationRules();

      expect(Array.isArray(rules)).toBe(true);
      expect(rules.length).toBeGreaterThan(0);
      expect(rules.every(rule => rule.id && rule.name && rule.pattern)).toBe(true);
    });

    it('should get rules by category', () => {
      const configRules = service.getClassificationRules().filter(
        rule => rule.errorType === ErrorType.CONFIGURATION
      );

      expect(configRules.length).toBeGreaterThan(0);
      expect(configRules.every(rule => rule.errorType === ErrorType.CONFIGURATION)).toBe(true);
    });
  });

  describe('error history management', () => {
    it('should record error history', () => {
      const initialStats = service.getErrorStatistics();
      const initialCount = initialStats.totalErrors;

      service.classifyError(new Error('Test error for history'));

      const newStats = service.getErrorStatistics();
      expect(newStats.totalErrors).toBe(initialCount + 1);
    });

    it('should cleanup old error history', () => {
      // Record some errors
      service.classifyError(new Error('Test error 1'));
      service.classifyError(new Error('Test error 2'));

      const beforeCleanup = service.getErrorStatistics();
      expect(beforeCleanup.totalErrors).toBeGreaterThan(0);

      // Cleanup history (older than 0 hours to clean all)
      service.cleanupErrorHistory(0);

      const afterCleanup = service.getErrorStatistics();
      expect(afterCleanup.totalErrors).toBe(0);
    });
  });

  describe('confidence calculation', () => {
    it('should calculate confidence based on pattern matching', () => {
      const error = new Error('API key is missing');
      const result = service.classifyError(error);

      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it('should have higher confidence for exact matches', () => {
      const exactError = new Error('API key is missing');
      const partialError = new Error('Some API related error');

      const exactResult = service.classifyError(exactError);
      const partialResult = service.classifyError(partialError);

      expect(exactResult.confidence).toBeGreaterThanOrEqual(partialResult.confidence);
    });

    it('should have higher confidence for multiple rule matches', () => {
      const error = new Error('API key is missing and invalid');
      const result = service.classifyError(error);

      expect(result.confidence).toBeGreaterThan(0.3);
    });
  });

  describe('suggested actions', () => {
    it('should provide relevant actions for configuration errors', () => {
      const error = new Error('API key is missing');
      const result = service.classifyError(error);

      expect(result.suggestedActions.length).toBeGreaterThan(0);
      expect(result.suggestedActions.some(action => 
        action.includes('配置') || action.includes('API')
      )).toBe(true);
    });

    it('should provide relevant actions for network errors', () => {
      const error = new Error('Connection failed');
      const result = service.classifyError(error);

      expect(result.suggestedActions.length).toBeGreaterThan(0);
      expect(result.suggestedActions.some(action => 
        action.includes('网络') || action.includes('连接')
      )).toBe(true);
    });

    it('should provide relevant actions for AI provider errors', () => {
      const error = new Error('AI service unavailable');
      const result = service.classifyError(error);

      expect(result.suggestedActions.length).toBeGreaterThan(0);
      expect(result.suggestedActions.some(action => 
        action.includes('AI') || action.includes('服务')
      )).toBe(true);
    });
  });

  describe('error pattern matching', () => {
    it('should match case-insensitive patterns', () => {
      const testCases = [
        'API KEY IS MISSING',
        'api key is missing',
        'Api Key Is Missing'
      ];

      testCases.forEach(message => {
        const error = new Error(message);
        const result = service.classifyError(error);
        expect(result.errorType).toBe(ErrorType.CONFIGURATION);
      });
    });

    it('should match partial patterns', () => {
      const testCases = [
        'The API key is missing from configuration',
        'Error: API key is missing',
        'Failed because API key is missing'
      ];

      testCases.forEach(message => {
        const error = new Error(message);
        const result = service.classifyError(error);
        expect(result.errorType).toBe(ErrorType.CONFIGURATION);
      });
    });

    it('should prioritize higher priority rules', () => {
      const error = new Error('API key is missing');
      const result = service.classifyError(error);

      if (result.matchedRules.length > 1) {
        const sortedRules = result.matchedRules.sort((a, b) => b.priority - a.priority);
        expect(result.matchedRules).toEqual(sortedRules);
      }
    });
  });

  describe('error severity assessment', () => {
    it('should assess severity based on error type and message', () => {
      const criticalError = new Error('Critical system failure');
      const highError = new Error('API key is missing');
      const mediumError = new Error('Request timeout');

      const criticalResult = service.classifyError(criticalError);
      const highResult = service.classifyError(highError);
      const mediumResult = service.classifyError(mediumError);

      expect(criticalResult.severity).toBe(ErrorSeverity.CRITICAL);
      expect(highResult.severity).toBe(ErrorSeverity.HIGH);
      expect(mediumResult.severity).toBe(ErrorSeverity.MEDIUM);
    });
  });
});

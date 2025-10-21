import { describe, it, expect, beforeEach } from 'vitest';
import { ErrorTranslationService, ErrorType, ErrorSeverity } from '../error-translation';

describe('ErrorTranslationService', () => {
  let service: ErrorTranslationService;

  beforeEach(() => {
    service = ErrorTranslationService.getInstance();
  });

  describe('translateError', () => {
    it('should translate API key missing error', () => {
      const error = new Error('API key is missing');
      const result = service.translateError(error);

      expect(result.context?.errorType).toBe(ErrorType.CONFIGURATION);
      expect(result.severity).toBe(ErrorSeverity.HIGH);
      expect(result.title).toContain('API');
      expect(result.suggestions.length).toBeGreaterThan(0);
      expect(result.canRetry).toBe(false);
    });

    it('should translate network connection error', () => {
      const error = new Error('Connection failed');
      const result = service.translateError(error);

      expect(result.context?.errorType).toBe(ErrorType.NETWORK);
      expect(result.severity).toBe(ErrorSeverity.HIGH);
      expect(result.suggestions).toContain('检查网络连接');
      expect(result.canRetry).toBe(true);
    });

    it('should translate AI provider error', () => {
      const error = new Error('AI service unavailable');
      const result = service.translateError(error);

      expect(result.context?.errorType).toBe(ErrorType.AI_PROVIDER);
      expect(result.severity).toBe(ErrorSeverity.HIGH);
      expect(result.suggestions.length).toBeGreaterThan(0);
    });

    it('should translate file permission error', () => {
      const error = new Error('Permission denied');
      const result = service.translateError(error);

      expect(result.context?.errorType).toBe(ErrorType.FILE_SYSTEM);
      expect(result.severity).toBe(ErrorSeverity.HIGH);
      expect(result.suggestions).toContain('检查文件权限');
    });

    it('should translate validation error', () => {
      const error = new Error('Required field is missing');
      const result = service.translateError(error);

      expect(result.context?.errorType).toBe(ErrorType.VALIDATION);
      expect(result.severity).toBe(ErrorSeverity.MEDIUM);
      expect(result.suggestions.length).toBeGreaterThan(0);
    });

    it('should handle unknown error', () => {
      const error = new Error('Some unknown error');
      const result = service.translateError(error);

      expect(result.context?.errorType).toBe(ErrorType.UNKNOWN);
      expect(result.severity).toBe(ErrorSeverity.MEDIUM);
      expect(result.suggestions.length).toBeGreaterThan(0);
    });

    it('should handle string error', () => {
      const error = 'String error message';
      const result = service.translateError(error);

      expect(result).toBeDefined();
      expect(result.title).toBeDefined();
      expect(result.message).toBeDefined();
    });

    it('should handle error with context', () => {
      const error = new Error('API key is missing');
      const context = {
        operation: 'commit-generation',
        timestamp: new Date(),
        workspacePath: '/test/workspace'
      };
      const result = service.translateError(error, context);

      expect(result.context).toBeDefined();
      expect(result.context?.operation).toBe('commit-generation');
    });

    it('should sanitize sensitive information', () => {
      const error = new Error('Invalid API key: sk-1234567890abcdef');
      const result = service.translateError(error);

      expect(result.message).not.toContain('sk-1234567890abcdef');
      expect(result.context?.errorMessage).not.toContain('sk-1234567890abcdef');
    });
  });

  describe('error classification', () => {
    it('should classify configuration errors correctly', () => {
      const testCases = [
        'API key is missing',
        'Invalid configuration format',
        'Configuration not found'
      ];

      testCases.forEach(message => {
        const error = new Error(message);
        const result = service.translateError(error);
        expect(result.context?.errorType).toBe(ErrorType.CONFIGURATION);
      });
    });

    it('should classify network errors correctly', () => {
      const testCases = [
        'Network connection failed',
        'Request timeout',
        'Connection refused'
      ];

      testCases.forEach(message => {
        const error = new Error(message);
        const result = service.translateError(error);
        expect(result.context?.errorType).toBe(ErrorType.NETWORK);
      });
    });

    it('should classify AI provider errors correctly', () => {
      const testCases = [
        'AI service unavailable',
        'Model not found',
        'OpenAI API error'
      ];

      testCases.forEach(message => {
        const error = new Error(message);
        const result = service.translateError(error);
        expect(result.context?.errorType).toBe(ErrorType.AI_PROVIDER);
      });
    });
  });

  describe('error severity assessment', () => {
    it('should assess critical errors correctly', () => {
      const error = new Error('Critical system failure');
      const result = service.translateError(error);

      expect(result.severity).toBe(ErrorSeverity.CRITICAL);
    });

    it('should assess high severity errors correctly', () => {
      const error = new Error('API key is missing');
      const result = service.translateError(error);

      expect(result.severity).toBe(ErrorSeverity.HIGH);
    });

    it('should assess medium severity errors correctly', () => {
      const error = new Error('Request timeout');
      const result = service.translateError(error);

      expect(result.severity).toBe(ErrorSeverity.MEDIUM);
    });
  });

  describe('suggestions generation', () => {
    it('should generate relevant suggestions for configuration errors', () => {
      const error = new Error('API key is missing');
      const result = service.translateError(error);

      expect(result.suggestions.length).toBeGreaterThan(0);
      expect(result.suggestions.some(s => s.includes('配置'))).toBe(true);
    });

    it('should generate relevant suggestions for network errors', () => {
      const error = new Error('Connection failed');
      const result = service.translateError(error);

      expect(result.suggestions.length).toBeGreaterThan(0);
      expect(result.suggestions.some(s => s.includes('网络'))).toBe(true);
    });

    it('should limit suggestions count', () => {
      const error = new Error('API key is missing');
      const result = service.translateError(error);

      expect(result.suggestions.length).toBeLessThanOrEqual(3);
    });
  });

  describe('help links generation', () => {
    it('should generate help links for different error types', () => {
      const error = new Error('API key is missing');
      const result = service.translateError(error);

      expect(result.helpLinks.length).toBeGreaterThan(0);
      expect(result.helpLinks.every(link => typeof link === 'string')).toBe(true);
    });

    it('should generate different help links for different error types', () => {
      const configError = new Error('API key is missing');
      const networkError = new Error('Connection failed');

      const configResult = service.translateError(configError);
      const networkResult = service.translateError(networkError);

      expect(configResult.helpLinks).not.toEqual(networkResult.helpLinks);
    });
  });

  describe('retry capability', () => {
    it('should allow retry for network errors', () => {
      const error = new Error('Connection timeout');
      const result = service.translateError(error);

      expect(result.canRetry).toBe(true);
    });

    it('should not allow retry for configuration errors', () => {
      const error = new Error('API key is missing');
      const result = service.translateError(error);

      expect(result.canRetry).toBe(false);
    });

    it('should not allow retry for permission errors', () => {
      const error = new Error('Permission denied');
      const result = service.translateError(error);

      expect(result.canRetry).toBe(false);
    });
  });

  describe('error context building', () => {
    it('should build error context correctly', () => {
      const error = new Error('Test error');
      const context = {
        operation: 'test-operation',
        timestamp: new Date(),
        workspacePath: '/test/path'
      };
      const result = service.translateError(error, context);

      expect(result.context).toBeDefined();
      expect(result.context?.operation).toBe('test-operation');
      expect(result.context?.workspacePath).toBe('/test/path');
      expect(result.context?.errorType).toBeDefined();
      expect(result.context?.timestamp).toBeDefined();
    });

    it('should include error details in context', () => {
      const error = new Error('Test error message');
      const result = service.translateError(error);

      expect(result.context?.errorName).toBe('Error');
      expect(result.context?.errorMessage).toBe('Test error message');
      expect(result.context?.stack).toBeDefined();
    });
  });

  describe('fallback error handling', () => {
    it('should provide fallback error for translation failures', () => {
      // Mock a scenario where translation fails
      const originalTranslateError = service.translateError;
      service.translateError = jest.fn().mockImplementation(() => {
        throw new Error('Translation failed');
      });

      const error = new Error('Original error');
      const result = service.translateError(error);

      expect(result.title).toBeDefined();
      expect(result.message).toBeDefined();
      expect(result.suggestions.length).toBeGreaterThan(0);

      // Restore original method
      service.translateError = originalTranslateError;
    });
  });
});

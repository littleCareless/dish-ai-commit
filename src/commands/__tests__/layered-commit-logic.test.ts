import { describe, it, expect } from 'vitest';

describe('Layered Commit Logic', () => {
  it('should use layered commit when enabled and multiple files are selected', () => {
    // Arrange
    const configuration = {
      features: {
        commitFormat: {
          enableLayeredCommit: true
        }
      }
    };
    
    const selectedFiles = ['file1.ts', 'file2.ts']; // Multiple files
    
    // Act
    const shouldUseLayeredCommit = 
      configuration.features.commitFormat.enableLayeredCommit && 
      selectedFiles && 
      selectedFiles.length > 1;
    
    // Assert
    expect(shouldUseLayeredCommit).toBe(true);
  });
  
  it('should not use layered commit when enabled but only one file is selected', () => {
    // Arrange
    const configuration = {
      features: {
        commitFormat: {
          enableLayeredCommit: true
        }
      }
    };
    
    const selectedFiles = ['file1.ts']; // Only one file
    
    // Act
    const shouldUseLayeredCommit = 
      configuration.features.commitFormat.enableLayeredCommit && 
      selectedFiles && 
      selectedFiles.length > 1;
    
    // Assert
    expect(shouldUseLayeredCommit).toBe(false);
  });
  
  it('should not use layered commit when disabled regardless of file count', () => {
    // Arrange
    const configuration = {
      features: {
        commitFormat: {
          enableLayeredCommit: false // Disabled
        }
      }
    };
    
    const selectedFiles = ['file1.ts', 'file2.ts']; // Multiple files
    
    // Act
    const shouldUseLayeredCommit = 
      configuration.features.commitFormat.enableLayeredCommit && 
      selectedFiles && 
      selectedFiles.length > 1;
    
    // Assert
    expect(shouldUseLayeredCommit).toBe(false);
  });
  
  it('should not use layered commit when no files are selected', () => {
    // Arrange
    const configuration = {
      features: {
        commitFormat: {
          enableLayeredCommit: true
        }
      }
    };
    
    const selectedFiles = undefined; // No files selected
    
    // Act
    // 注意：这里我们需要处理selectedFiles为undefined的情况
    const shouldUseLayeredCommit = 
      configuration.features.commitFormat.enableLayeredCommit && 
      selectedFiles && 
      selectedFiles.length > 1;
    
    // Assert
    // 当selectedFiles为undefined时，整个表达式的结果是undefined，而不是false
    // 但在实际代码中，undefined会被视为falsy值
    expect(!!shouldUseLayeredCommit).toBe(false);
  });
});
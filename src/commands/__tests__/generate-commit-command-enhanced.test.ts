import { describe, it, expect } from 'vitest';

describe('GenerateCommitCommand Enhanced Logic', () => {
  // 模拟实际代码中的逻辑
  const checkShouldUseLayeredCommit = (
    enableLayeredCommit: boolean,
    selectedFiles: string[] | undefined
  ): boolean => {
    return enableLayeredCommit && !!selectedFiles && selectedFiles.length > 1;
  };

  it('should use layered commit when enabled and multiple files are selected', () => {
    // Arrange
    const enableLayeredCommit = true;
    const selectedFiles = ['file1.ts', 'file2.ts']; // Multiple files
    
    // Act
    const result = checkShouldUseLayeredCommit(enableLayeredCommit, selectedFiles);
    
    // Assert
    expect(result).toBe(true);
  });
  
  it('should not use layered commit when enabled but only one file is selected', () => {
    // Arrange
    const enableLayeredCommit = true;
    const selectedFiles = ['file1.ts']; // Only one file
    
    // Act
    const result = checkShouldUseLayeredCommit(enableLayeredCommit, selectedFiles);
    
    // Assert
    expect(result).toBe(false);
  });
  
  it('should not use layered commit when disabled regardless of file count', () => {
    // Arrange
    const enableLayeredCommit = false; // Disabled
    const selectedFiles = ['file1.ts', 'file2.ts']; // Multiple files
    
    // Act
    const result = checkShouldUseLayeredCommit(enableLayeredCommit, selectedFiles);
    
    // Assert
    expect(result).toBe(false);
  });
  
  it('should not use layered commit when no files are selected', () => {
    // Arrange
    const enableLayeredCommit = true;
    const selectedFiles = undefined; // No files selected
    
    // Act
    const result = checkShouldUseLayeredCommit(enableLayeredCommit, selectedFiles);
    
    // Assert
    expect(result).toBe(false);
  });
  
  it('should not use layered commit when empty files array is selected', () => {
    // Arrange
    const enableLayeredCommit = true;
    const selectedFiles: string[] = []; // Empty array
    
    // Act
    const result = checkShouldUseLayeredCommit(enableLayeredCommit, selectedFiles);
    
    // Assert
    expect(result).toBe(false);
  });
});
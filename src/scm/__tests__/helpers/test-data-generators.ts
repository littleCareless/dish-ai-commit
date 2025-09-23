/**
 * Test data generators for Git and SVN operations
 */

import { 
  GitCommitData, 
  SvnCommitData, 
  DiffData, 
  DiffHunk,
  MockFileSystemEntry,
  TempDirectoryConfig 
} from './test-interfaces';
import { TestUtils } from './test-utilities';

/**
 * Git test data generator
 */
export class GitTestData {
  /**
   * Generate Git diff output
   */
  static generateDiffOutput(files: string[]): string {
    return files.map(file => {
      const fileName = file.split('/').pop() || file;
      return `diff --git a/${file} b/${file}
index 1234567..abcdefg 100644
--- a/${file}
+++ b/${file}
@@ -1,3 +1,4 @@
 line 1
 line 2
+new line added
 line 3`;
    }).join('\n\n');
  }

  /**
   * Generate Git commit log entries
   */
  static generateCommitLog(count: number): GitCommitData[] {
    const commits: GitCommitData[] = [];
    const baseDate = new Date();
    
    for (let i = 0; i < count; i++) {
      const date = new Date(baseDate.getTime() - (i * 24 * 60 * 60 * 1000));
      commits.push({
        hash: `commit${i.toString().padStart(7, '0')}abcdef`,
        author: `Author ${i + 1}`,
        email: `author${i + 1}@example.com`,
        date: date.toISOString(),
        message: `Commit message ${i + 1}\n\nDetailed description of changes made in commit ${i + 1}.`,
      });
    }
    
    return commits;
  }

  /**
   * Generate Git commit log output string
   */
  static generateCommitLogOutput(commits: GitCommitData[]): string {
    return commits.map(commit => 
      `commit ${commit.hash}
Author: ${commit.author} <${commit.email}>
Date: ${commit.date}

    ${commit.message}`
    ).join('\n\n');
  }

  /**
   * Generate Git branch list
   */
  static generateBranchList(branches: string[] = ['main', 'develop', 'feature/test']): string[] {
    return branches;
  }

  /**
   * Generate Git branch list output
   */
  static generateBranchListOutput(branches: string[], currentBranch = 'main'): string {
    return branches.map(branch => 
      branch === currentBranch ? `* ${branch}` : `  ${branch}`
    ).join('\n');
  }

  /**
   * Generate Git config output
   */
  static generateGitConfig(config: Record<string, string> = {}): Record<string, string> {
    return {
      'user.name': 'Test User',
      'user.email': 'test@example.com',
      'core.editor': 'code --wait',
      'init.defaultBranch': 'main',
      ...config,
    };
  }

  /**
   * Generate Git status output
   */
  static generateGitStatus(files: { path: string; status: string }[]): string {
    const statusMap: Record<string, string> = {
      'M': 'modified',
      'A': 'new file',
      'D': 'deleted',
      'R': 'renamed',
      'C': 'copied',
      'U': 'unmerged',
    };

    return files.map(file => 
      `${file.status.padEnd(2)} ${file.path}`
    ).join('\n');
  }

  /**
   * Generate Git log with specific format
   */
  static generateGitLogFormatted(
    commits: GitCommitData[],
    format = '--oneline'
  ): string {
    switch (format) {
      case '--oneline':
        return commits.map(commit => 
          `${commit.hash.substring(0, 7)} ${commit.message.split('\n')[0]}`
        ).join('\n');
      case '--pretty=format:%H|%an|%ae|%ad|%s':
        return commits.map(commit => 
          `${commit.hash}|${commit.author}|${commit.email}|${commit.date}|${commit.message.split('\n')[0]}`
        ).join('\n');
      default:
        return this.generateCommitLogOutput(commits);
    }
  }

  /**
   * Generate Git diff for specific files
   */
  static generateFileDiff(
    file: string,
    oldContent: string,
    newContent: string
  ): DiffData {
    const oldLines = oldContent.split('\n');
    const newLines = newContent.split('\n');
    
    const hunks: DiffHunk[] = [{
      oldStart: 1,
      oldLines: oldLines.length,
      newStart: 1,
      newLines: newLines.length,
      lines: [
        ...oldLines.map(line => `-${line}`),
        ...newLines.map(line => `+${line}`),
      ],
    }];

    return {
      file,
      oldContent,
      newContent,
      hunks,
    };
  }
}

/**
 * SVN test data generator
 */
export class SvnTestData {
  /**
   * Generate SVN diff output
   */
  static generateSvnDiffOutput(files: string[]): string {
    return files.map(file => {
      return `Index: ${file}
===================================================================
--- ${file}\t(revision 123)
+++ ${file}\t(working copy)
@@ -1,3 +1,4 @@
 line 1
 line 2
+new line added
 line 3`;
    }).join('\n\n');
  }

  /**
   * Generate SVN log entries
   */
  static generateSvnCommitLog(count: number): SvnCommitData[] {
    const commits: SvnCommitData[] = [];
    const baseDate = new Date();
    
    for (let i = 0; i < count; i++) {
      const date = new Date(baseDate.getTime() - (i * 24 * 60 * 60 * 1000));
      commits.push({
        revision: count - i,
        author: `author${i + 1}`,
        date: date.toISOString(),
        message: `SVN commit message ${count - i}`,
        paths: [`/trunk/file${i + 1}.txt`, `/trunk/folder${i + 1}/`],
      });
    }
    
    return commits;
  }

  /**
   * Generate SVN log XML output
   */
  static generateSvnLogXml(commits: SvnCommitData[]): string {
    const entries = commits.map(commit => `
<logentry revision="${commit.revision}">
<author>${commit.author}</author>
<date>${commit.date}</date>
<msg>${commit.message}</msg>
<paths>
${commit.paths.map(path => `<path action="M">${path}</path>`).join('\n')}
</paths>
</logentry>`).join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<log>
${entries}
</log>`;
  }

  /**
   * Generate SVN info output
   */
  static generateSvnInfo(config: {
    url?: string;
    revision?: number;
    author?: string;
    workingCopyRoot?: string;
  } = {}): string {
    return `Path: .
Working Copy Root Path: ${config.workingCopyRoot || '/mock/svn/repo'}
URL: ${config.url || 'https://svn.example.com/repo/trunk'}
Relative URL: ^/trunk
Repository Root: https://svn.example.com/repo
Repository UUID: 12345678-1234-1234-1234-123456789abc
Revision: ${config.revision || 123}
Node Kind: directory
Schedule: normal
Last Changed Author: ${config.author || 'testuser'}
Last Changed Rev: ${config.revision || 123}
Last Changed Date: ${new Date().toISOString()}`;
  }

  /**
   * Generate SVN auth output
   */
  static generateSvnAuthOutput(username = 'testuser'): string {
    return `Authentication realm: <https://svn.example.com:443> Example SVN Repository
Password for '${username}': 
Store password unencrypted (yes/no)? yes
Username: ${username}`;
  }

  /**
   * Generate SVN status output
   */
  static generateSvnStatus(files: { path: string; status: string }[]): string {
    return files.map(file => 
      `${file.status.padEnd(8)} ${file.path}`
    ).join('\n');
  }

  /**
   * Generate SVN list output
   */
  static generateSvnList(entries: string[]): string {
    return entries.join('\n');
  }

  /**
   * Generate SVN propget output
   */
  static generateSvnPropget(property: string, value: string): string {
    return `${property}: ${value}`;
  }

  /**
   * Generate SVN blame output
   */
  static generateSvnBlame(lines: { revision: number; author: string; content: string }[]): string {
    return lines.map(line => 
      `${line.revision.toString().padStart(6)} ${line.author.padEnd(10)} ${line.content}`
    ).join('\n');
  }
}

/**
 * Test file system manager
 */
export class TestFileSystem {
  private static tempDirs: string[] = [];

  /**
   * Create a temporary Git repository structure
   */
  static createTempGitRepo(config: {
    files?: string[];
    branches?: string[];
    commits?: GitCommitData[];
  } = {}): string {
    const tempPath = `/tmp/test-git-${TestUtils.randomString()}`;
    this.tempDirs.push(tempPath);

    // Mock the directory structure
    const structure: MockFileSystemEntry = {
      path: tempPath,
      type: 'directory',
      children: [
        {
          path: `${tempPath}/.git`,
          type: 'directory',
          children: [
            { path: `${tempPath}/.git/config`, type: 'file', content: '[core]\n\trepositoryformatversion = 0' },
            { path: `${tempPath}/.git/HEAD`, type: 'file', content: 'ref: refs/heads/main' },
          ],
        },
        ...(config.files || ['README.md', 'src/index.ts']).map(file => ({
          path: `${tempPath}/${file}`,
          type: 'file' as const,
          content: `// Content of ${file}\nconsole.log('Hello World');`,
        })),
      ],
    };

    return tempPath;
  }

  /**
   * Create a temporary SVN repository structure
   */
  static createTempSvnRepo(config: {
    files?: string[];
    revision?: number;
  } = {}): string {
    const tempPath = `/tmp/test-svn-${TestUtils.randomString()}`;
    this.tempDirs.push(tempPath);

    // Mock the directory structure
    const structure: MockFileSystemEntry = {
      path: tempPath,
      type: 'directory',
      children: [
        {
          path: `${tempPath}/.svn`,
          type: 'directory',
          children: [
            { path: `${tempPath}/.svn/entries`, type: 'file', content: '12\n\ndir\n123\n' },
            { path: `${tempPath}/.svn/wc.db`, type: 'file', content: 'SQLite database' },
          ],
        },
        ...(config.files || ['README.md', 'src/index.ts']).map(file => ({
          path: `${tempPath}/${file}`,
          type: 'file' as const,
          content: `// Content of ${file}\nconsole.log('Hello World');`,
        })),
      ],
    };

    return tempPath;
  }

  /**
   * Create a mock workspace with specified SCM type
   */
  static createMockWorkspace(type: 'git' | 'svn' | 'none', config: any = {}): string {
    switch (type) {
      case 'git':
        return this.createTempGitRepo(config);
      case 'svn':
        return this.createTempSvnRepo(config);
      case 'none':
        const tempPath = `/tmp/test-none-${TestUtils.randomString()}`;
        this.tempDirs.push(tempPath);
        return tempPath;
      default:
        throw new Error(`Unknown SCM type: ${type}`);
    }
  }

  /**
   * Create a directory structure from configuration
   */
  static createDirectoryStructure(config: TempDirectoryConfig): string {
    const tempPath = `/tmp/${config.prefix}-${TestUtils.randomString()}`;
    this.tempDirs.push(tempPath);

    if (config.structure) {
      this.createStructureRecursive(tempPath, config.structure);
    }

    return tempPath;
  }

  /**
   * Recursively create directory structure (mock implementation)
   */
  private static createStructureRecursive(basePath: string, entries: MockFileSystemEntry[]): void {
    // This is a mock implementation - in real tests, this would create actual files
    // For now, we just track the structure for testing purposes
    entries.forEach(entry => {
      if (entry.type === 'directory' && entry.children) {
        this.createStructureRecursive(entry.path, entry.children);
      }
    });
  }

  /**
   * Clean up temporary directories
   */
  static cleanup(path?: string): void {
    if (path) {
      const index = this.tempDirs.indexOf(path);
      if (index > -1) {
        this.tempDirs.splice(index, 1);
      }
    } else {
      // Clean up all temporary directories
      this.tempDirs.length = 0;
    }
  }

  /**
   * Clean up all temporary directories
   */
  static cleanupAll(): void {
    this.cleanup();
  }

  /**
   * Get all temporary directories
   */
  static getTempDirs(): string[] {
    return [...this.tempDirs];
  }

  /**
   * Check if a path is a temporary directory
   */
  static isTempDir(path: string): boolean {
    return this.tempDirs.includes(path);
  }

  /**
   * Generate file content for testing
   */
  static generateFileContent(type: 'typescript' | 'javascript' | 'markdown' | 'json' | 'text', size = 'small'): string {
    const sizes = {
      small: 10,
      medium: 100,
      large: 1000,
    };

    const lineCount = sizes[size as keyof typeof sizes] || 10;

    switch (type) {
      case 'typescript':
        return Array.from({ length: lineCount }, (_, i) => 
          `// Line ${i + 1}\nfunction test${i + 1}(): void {\n  console.log('Test ${i + 1}');\n}`
        ).join('\n\n');

      case 'javascript':
        return Array.from({ length: lineCount }, (_, i) => 
          `// Line ${i + 1}\nfunction test${i + 1}() {\n  console.log('Test ${i + 1}');\n}`
        ).join('\n\n');

      case 'markdown':
        return Array.from({ length: lineCount }, (_, i) => 
          `# Heading ${i + 1}\n\nThis is paragraph ${i + 1} with some content.`
        ).join('\n\n');

      case 'json':
        const jsonObj = Object.fromEntries(
          Array.from({ length: lineCount }, (_, i) => [`key${i + 1}`, `value${i + 1}`])
        );
        return JSON.stringify(jsonObj, null, 2);

      case 'text':
      default:
        return Array.from({ length: lineCount }, (_, i) => 
          `This is line ${i + 1} of the test file.`
        ).join('\n');
    }
  }
}
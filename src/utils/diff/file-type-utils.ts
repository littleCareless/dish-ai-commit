import { PreferencesSettingsManager } from "@/services/settings/preferences-settings-manager";
import * as fs from "fs";
import micromatch from "micromatch";
import * as path from "path";

// Sentinel string injected into synthetic diff blocks so downstream processors
// can reliably identify placeholder content that intentionally omits real diffs.
export const SKIPPED_DIFF_PLACEHOLDER_SENTINEL = "[DishAI-SkipDiff-Placeholder]";

/**
 * 文件类型工具类
 * 用于判断文件是否应该跳过 diff 生成
 */
export class FileTypeUtils {
    // 默认的非代码文件扩展名集合（作为备用）
    private static readonly DEFAULT_NON_CODE_FILE_EXTENSIONS = new Set([
        // 图片
        '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.ico', '.webp', '.svg',
        '.tiff', '.tif', '.psd', '.ai', '.eps', '.raw', '.heic', '.avif',
        // 视频
        '.mp4', '.avi', '.mov', '.mkv', '.webm', '.flv', '.wmv', '.m4v',
        '.mpg', '.mpeg', '.3gp', '.ogv',
        // 音频
        '.mp3', '.wav', '.ogg', '.m4a', '.flac', '.aac', '.wma', '.opus',
        // 字体
        '.ttf', '.otf', '.woff', '.woff2', '.eot',
        // 压缩包
        '.zip', '.tar', '.gz', '.rar', '.7z', '.bz2', '.xz',
        // Office & PDF
        '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
        // 二进制
        '.exe', '.dll', '.so', '.dylib', '.wasm', '.class', '.pyc',
        // 数据库
        '.db', '.sqlite', '.sqlite3',
    ]);

    // 缓存 .gitattributes 的二进制文件配置
    private static gitAttributesCache: Map<string, Set<string>> = new Map();

    /**
     * 主入口：判断文件是否应该跳过 diff 生成
     * @param filePath 文件路径（完整路径）
     * @param repositoryPath 仓库根路径（用于读取 .gitattributes）
     * @returns 如果应该跳过 diff 返回 true
     */
    static shouldSkipDiff(filePath: string, repositoryPath?: string): boolean {
        if (!filePath) {
            return false;
        }

        try {
            const settings = PreferencesSettingsManager.getInstance().getSettings();

            // 1. 检查文件扩展名
            if (this.isNonCodeFileByExtension(filePath, settings.skipDiffFileExtensions)) {
                return true;
            }

            // 2. 检查路径模式（Glob）
            if (this.matchesPathPattern(filePath, settings.skipDiffPathPatterns)) {
                return true;
            }

            // 3. 检查文件大小
            if (settings.maxDiffFileSizeKB > 0) {
                if (this.isFileTooLarge(filePath, settings.maxDiffFileSizeKB)) {
                    return true;
                }
            }

            // 4. 自动检测二进制文件
            if (settings.autoDetectBinaryFiles) {
                if (this.isBinaryFile(filePath)) {
                    return true;
                }
            }

            // 5. 读取 .gitattributes 配置
            if (settings.respectGitAttributes && repositoryPath) {
                const gitBinaryExtensions = this.getGitAttributesBinaryExtensions(repositoryPath);
                const ext = this.getFileExtension(filePath);
                if (ext && gitBinaryExtensions.has(ext)) {
                    return true;
                }
            }

            return false;
        } catch (error) {
            console.warn('Error checking if file should skip diff:', error);
            return false;
        }
    }

    /**
     * 根据扩展名判断是否为非代码文件
     */
    private static isNonCodeFileByExtension(
        filename: string,
        userExtensions: string[]
    ): boolean {
        const ext = this.getFileExtension(filename);
        if (!ext) {
            return false;
        }

        // 优先使用用户配置
        if (userExtensions && userExtensions.length > 0) {
            const extensions = new Set(userExtensions.map(e => e.toLowerCase()));
            return extensions.has(ext);
        }

        // 使用默认配置
        return this.DEFAULT_NON_CODE_FILE_EXTENSIONS.has(ext);
    }

    /**
     * 检查文件是否匹配路径模式
     */
    private static matchesPathPattern(filePath: string, patterns: string[]): boolean {
        if (!patterns || patterns.length === 0) {
            return false;
        }

        // 归一化路径分隔符
        const normalizedPath = filePath.replace(/\\/g, '/');
        return micromatch.isMatch(normalizedPath, patterns);
    }

    /**
     * 检查文件是否超过大小限制
     */
    private static isFileTooLarge(filePath: string, maxSizeKB: number): boolean {
        if (maxSizeKB === 0) {
            return false;
        }

        try {
            const stats = fs.statSync(filePath);
            const fileSizeKB = stats.size / 1024;
            return fileSizeKB > maxSizeKB;
        } catch (error) {
            return false;
        }
    }

    /**
     * 检测文件是否为二进制文件
     * 通过检查文件内容中是否包含 null 字符
     */
    private static isBinaryFile(filePath: string): boolean {
        try {
            // 只读取文件的前 8000 字节进行检测
            const fd = fs.openSync(filePath, 'r');
            const buffer = Buffer.alloc(8000);
            const bytesRead = fs.readSync(fd, buffer, 0, 8000, 0);
            fs.closeSync(fd);

            // 检查是否包含 null 字符
            for (let i = 0; i < bytesRead; i++) {
                if (buffer[i] === 0) {
                    return true;
                }
            }

            return false;
        } catch (error) {
            return false;
        }
    }

    /**
     * 读取 .gitattributes 文件中标记为 binary 的文件扩展名
     */
    private static getGitAttributesBinaryExtensions(repositoryPath: string): Set<string> {
        // 检查缓存
        if (this.gitAttributesCache.has(repositoryPath)) {
            return this.gitAttributesCache.get(repositoryPath)!;
        }

        const binaryExtensions = new Set<string>();
        const attributesPath = path.join(repositoryPath, '.gitattributes');

        try {
            if (!fs.existsSync(attributesPath)) {
                this.gitAttributesCache.set(repositoryPath, binaryExtensions);
                return binaryExtensions;
            }

            const content = fs.readFileSync(attributesPath, 'utf-8');
            const lines = content.split('\n');

            for (const line of lines) {
                // 跳过注释和空行
                const trimmedLine = line.trim();
                if (!trimmedLine || trimmedLine.startsWith('#')) {
                    continue;
                }

                // 匹配 *.ext binary 或 *.ext -text 格式
                const binaryMatch = trimmedLine.match(/^\*\.(\w+)\s+(binary|-text)/);
                if (binaryMatch) {
                    binaryExtensions.add(`.${binaryMatch[1].toLowerCase()}`);
                }
            }

            // 缓存结果
            this.gitAttributesCache.set(repositoryPath, binaryExtensions);
        } catch (error) {
            console.warn('Failed to read .gitattributes:', error);
            this.gitAttributesCache.set(repositoryPath, binaryExtensions);
        }

        return binaryExtensions;
    }

    /**
     * 获取文件扩展名（带点号，小写）
     */
    static getFileExtension(filename: string): string {
        const lastDotIndex = filename.lastIndexOf('.');
        const lastSlashIndex = Math.max(
            filename.lastIndexOf('/'),
            filename.lastIndexOf('\\')
        );

        // 确保点号在最后一个路径分隔符之后
        if (lastDotIndex > lastSlashIndex && lastDotIndex !== -1) {
            return filename.substring(lastDotIndex).toLowerCase();
        }

        return '';
    }

    /**
     * 获取文件类型的友好描述
     */
    static getFileTypeDescription(filename: string): string {
        const ext = this.getFileExtension(filename);

        if (!ext) {
            return 'Unknown File';
        }

        // 图片文件
        if (['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.ico', '.webp', '.svg',
            '.tiff', '.tif', '.psd', '.ai', '.eps', '.raw', '.heic', '.avif'].includes(ext)) {
            return 'Image File';
        }

        // 视频文件
        if (['.mp4', '.avi', '.mov', '.mkv', '.webm', '.flv', '.wmv', '.m4v',
            '.mpg', '.mpeg', '.3gp', '.ogv'].includes(ext)) {
            return 'Video File';
        }

        // 音频文件
        if (['.mp3', '.wav', '.ogg', '.m4a', '.flac', '.aac', '.wma', '.opus',
            '.mid', '.midi'].includes(ext)) {
            return 'Audio File';
        }

        // 字体文件
        if (['.ttf', '.otf', '.woff', '.woff2', '.eot'].includes(ext)) {
            return 'Font File';
        }

        // 压缩文件
        if (['.zip', '.tar', '.gz', '.rar', '.7z', '.bz2', '.xz', '.jar',
            '.war', '.ear', '.tgz'].includes(ext)) {
            return 'Archive File';
        }

        // Office 文档
        if (['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
            '.odt', '.ods', '.odp'].includes(ext)) {
            return 'Document File';
        }

        // 数据库文件
        if (['.db', '.sqlite', '.sqlite3', '.mdb', '.accdb'].includes(ext)) {
            return 'Database File';
        }

        return 'Binary/Resource File';
    }

    /**
     * 清除 .gitattributes 缓存（用于测试或强制刷新）
     */
    static clearGitAttributesCache(): void {
        this.gitAttributesCache.clear();
    }

    // === 向后兼容的方法 ===

    /**
     * @deprecated 使用 shouldSkipDiff 代替
     */
    static isNonCodeFile(filename: string): boolean {
        // 默认情况下，旧的 isNonCodeFile 行为只依赖于扩展名，不考虑其他复杂逻辑
        // 这里为了兼容性，我们只检查默认的非代码文件扩展名
        const ext = this.getFileExtension(filename);
        if (!ext) {
            return false;
        }
        return this.DEFAULT_NON_CODE_FILE_EXTENSIONS.has(ext);
    }
}


import * as vscode from 'vscode';
import * as child_process from 'child_process';
import { promisify } from 'util';

const exec = promisify(child_process.exec);

export class SVNService {
    constructor(private workspaceRoot: string) {}

    static async create(): Promise<SVNService | undefined> {
        const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (!workspaceRoot) {
            vscode.window.showErrorMessage('No workspace folder found');
            return undefined;
        }
        return new SVNService(workspaceRoot);
    }

    async getDiff(files?: string[]): Promise<string> {
        try {
            let command: string;
            if (files && files.length > 0) {
                // 对特定文件执行 diff
                const filesPaths = files.map(file => `"${file}"`).join(' ');
                command = `svn diff ${filesPaths}`;
            } else {
                // 对所有暂存文件执行 diff
                command = 'svn diff';
            }

            const { stdout, stderr } = await exec(command, { cwd: this.workspaceRoot });
            
            if (stderr) {
                throw new Error(stderr);
            }

            if (!stdout.trim()) {
                throw new Error('No changes found');
            }

            return stdout;
        } catch (error) {
            if (error instanceof Error) {
                vscode.window.showErrorMessage(`SVN diff failed: ${error.message}`);
            }
            throw error;
        }
    }

    async hasSVN(): Promise<boolean> {
        try {
            await exec('svn --version', { cwd: this.workspaceRoot });
            return true;
        } catch (error) {
            vscode.window.showErrorMessage('SVN is not installed or not available in PATH');
            return false;
        }
    }
}
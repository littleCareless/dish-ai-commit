import { ProfileManagerService } from '@/services/profile-manager/profile-manager-service';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';
import { SettingsMigration } from '../settings-migration';

// Mock vscode
vi.mock('vscode', () => ({
    workspace: {
        getConfiguration: vi.fn(),
    },
    window: {
        showInformationMessage: vi.fn(),
    },
}));

// Mock ProfileManagerService
vi.mock('@/services/profile-manager/profile-manager-service', () => ({
    ProfileManagerService: {
        getInstance: vi.fn(() => ({
            saveProfile: vi.fn(),
            setActiveProfile: vi.fn(),
        })),
    },
}));

describe('SettingsMigration', () => {
    let settingsMigration: SettingsMigration;
    let mockProfileManager: any;
    let mockConfig: any;

    beforeEach(() => {
        vi.clearAllMocks();
        mockProfileManager = ProfileManagerService.getInstance();
        settingsMigration = new SettingsMigration(mockProfileManager);

        mockConfig = {
            get: vi.fn(),
        };
        (vscode.workspace.getConfiguration as any).mockReturnValue(mockConfig);
    });

    it('should detect old configuration', async () => {
        mockConfig.get.mockImplementation((key: string) => {
            if (key === 'providers.openai.apiKey') return 'sk-test';
            return undefined;
        });

        const result = await settingsMigration.detectOldConfiguration();
        expect(result.hasOldConfig).toBe(true);
        expect(result.detectedProviders).toContain('openai');
    });

    it('should not detect if no config', async () => {
        mockConfig.get.mockImplementation((key: string) => {
            if (key === 'base.language') return 'Simplified Chinese';
            return undefined;
        });

        const result = await settingsMigration.detectOldConfiguration();
        expect(result.hasOldConfig).toBe(false);
    });

    it('should preview migration', async () => {
        mockConfig.get.mockImplementation((key: string) => {
            if (key === 'providers.openai.apiKey') return 'sk-test';
            if (key === 'base.language') return 'Simplified Chinese';
            return undefined;
        });

        const result = await settingsMigration.previewMigration();
        expect(result.profile.name).toBe('从旧配置迁移');
        expect(result.profile.providers['openai']).toBeDefined();
        expect(result.profile.providers['openai'].apiKey).toBe('sk-test');
        expect(result.profile.preferences.language).toBe('zh');
    });
});

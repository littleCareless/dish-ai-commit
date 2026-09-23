# Synthesis Changelog

**Session**: WFS-config-simplification
**Generated**: 2026-04-09

## Enhancements Applied

- **EP-001: 显式保存按钮**: Applied to F-001 (Dirty State Tracking). Features tab will show "Save (N changes)" button instead of auto-save on every toggle. Follows ProfileForm pattern.
- **EP-002: 外部变更检测**: Applied to F-006 (Save Status Notification). ConfigurationMonitor will notify Webview when settings.json changes externally.
- **EP-003: 同步结果反馈**: Applied to F-001 and F-006. syncFeaturesToSettingsJson returns SyncResult {synced, failed, skipped}, displayed in save notification.
- **EP-004: Toggle ON即时同步**: Applied to F-002 (Sync Toggle Control). Enabling toggle immediately syncs all non-default Feature Config to settings.json.

## Clarifications Resolved

- **配置存储架构**: globalState主 + 可选视图 → Applied to F-002, F-003
- **变更粒度**: 仅发送变更字段 → Applied to F-001
- **Profile切换同步**: 全量替换 → Applied to F-004
- **同步控制方式**: 显式开关 → Applied to F-002
- **保存反馈**: 状态通知 → Applied to F-006
- **迁移策略**: 渐进式 → Applied to F-002 (toggle default by user type)
- **配置分层**: 核心必选 + 功能可选 → Applied to F-003
- **实施优先级**: P0→P1→P2 → Reflected in feature priorities
- **开关与核心配置冲突**: 分层控制 → Applied to F-003
- **开关粒度**: 全局开关 → Applied to F-002

## Conflicts Resolved

- **PM核心必选 vs UX显式开关**: Layered control — core config always syncs, feature config gated by toggle. [RESOLVED]
- **System-architect全量替换 vs UX保留旧值**: Toggle OFF时不删除settings.json中的旧条目；Profile切换时先清除再写入。 [RESOLVED]
- **Frontend auto-save vs explicit save**: Changed to explicit save with dirty count (EP-001). ProfileForm already uses this pattern. [RESOLVED]

## Unresolved Items

None — all conflicts resolved during synthesis.

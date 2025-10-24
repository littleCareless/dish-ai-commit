## Why

API 密钥安全管理是 Dish AI Commit 的关键安全需求，当前实现存在严重的安全风险：

1. **明文存储风险**：API 密钥以明文形式存储在 VS Code 配置中，容易被恶意软件或未授权访问获取
2. **缺乏密钥轮换**：没有密钥过期提醒和自动轮换机制，长期使用同一密钥增加泄露风险
3. **无泄露检测**：缺乏密钥泄露监控和通知机制，无法及时发现安全事件
4. **使用统计缺失**：没有密钥使用情况统计，难以发现异常使用模式

这些安全问题可能导致用户 API 密钥泄露，造成经济损失和隐私泄露，严重影响用户信任。

## What Changes

- **ADDED**: API 密钥加密存储机制，使用系统级加密
- **ADDED**: 密钥轮换提醒和自动过期检测
- **ADDED**: 密钥泄露检测和通知系统
- **ADDED**: 密钥使用统计和异常监控
- **MODIFIED**: 配置管理界面，增强安全提示和验证

## Impact

- **Affected specs**: `security` capability
- **Affected code**: 
  - `src/config/configuration-manager.ts` - 配置管理安全增强
  - `src/ai/providers/` - 各提供商密钥处理优化
  - `src/webview-ui/src/pages/setting/` - 安全配置界面
  - `src/services/security/` - 新增安全服务模块
- **Security improvement**: 大幅提升 API 密钥安全性，降低泄露风险
- **User experience**: 提供安全配置指导和异常通知

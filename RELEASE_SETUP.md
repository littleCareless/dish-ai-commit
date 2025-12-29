# Release 脚本设置完成 ✅

## 📋 完成的工作

### 1. 创建的文件

| 文件                            | 说明                                      |
| ------------------------------- | ----------------------------------------- |
| `release.js`                    | 主 release 脚本，统一管理版本和 changelog |
| `webview-ui/.versionrc`         | webview-ui 的 standard-version 配置       |
| `webview-ui/CHANGELOG.zh-CN.md` | webview-ui 的 changelog 文件              |

### 2. 修改的文件

| 文件                      | 修改内容                                                                                                                                                        |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `package.json`            | - 版本号: 0.56.0 → 0.56.1<br>- 添加: `"release": "node release.js"`                                                                                             |
| `src/package.json`        | - 版本号: 0.56.1 (保持不变)<br>- 移除: `"release": "standard-version -i CHANGELOG.zh-CN.md"`<br>- 修改: `"changelog": "standard-version -i CHANGELOG.zh-CN.md"` |
| `webview-ui/package.json` | - 版本号: 0.54.0 → 0.56.1<br>- 添加: `"changelog": "standard-version -i CHANGELOG.zh-CN.md"`                                                                    |
| `.versionrc`              | - 移除: `skip` 配置块                                                                                                                                           |
| `src/.versionrc.js`       | - 移除: `skip` 配置块                                                                                                                                           |

### 3. 备份的文件

- `CHANGELOG.zh-CN.md.backup`
- `src/CHANGELOG.zh-CN.md.backup`

## 🚀 使用方法

### 基本使用

```bash
# 执行 release 流程
pnpm release
```

### 手动生成 changelog (可选)

```bash
# 为 src 生成
cd src && pnpm run changelog

# 为 webview-ui 生成
cd webview-ui && pnpm run changelog
```

## 📊 Release 流程

执行 `pnpm release` 后会自动完成：

1. ✅ **环境验证** - 检查 git 状态
2. ✅ **获取版本号** - 通过 standard-version 计算新版本
3. ✅ **同步版本** - 更新三个 package.json
4. ✅ **生成 changelog** - 为 src 和 webview-ui 生成
5. ✅ **合并 changelog** - 根目录包含所有变更
6. ✅ **创建 git 提交** - commit: chore(release): v{version}
7. ✅ **创建 git 标签** - tag: v{version}

## 🎯 预期效果

```
🚀 开始 Release 流程...

📦 新版本: 0.57.0

✅ 同步版本号
   - 根目录: 0.56.1 → 0.57.0
   - src: 0.56.1 → 0.57.0
   - webview-ui: 0.56.1 → 0.57.0

✅ 生成 changelog
   - src/CHANGELOG.zh-CN.md ✓
   - webview-ui/CHANGELOG.zh-CN.md ✓
   - 根目录 CHANGELOG.zh-CN.md ✓

✅ 创建 git 提交
   - commit: chore(release): v0.57.0
   - tag: v0.57.0

🎉 Release 完成！

💡 下一步: git push --follow-tags
```

## ⚙️ 配置说明

### Standard-version 配置

- **根目录**: `.versionrc` - 包含所有配置
- **src**: `src/.versionrc.js` - 与根目录一致
- **webview-ui**: `webview-ui/.versionrc` - 与根目录一致

### Changelog 格式

- 使用 Keep a Changelog 标准
- 支持 gitmoji 表情符号
- 中文 changelog
- 分类显示: ✨ Features, 🐛 Bug Fixes, 🚀 Chore 等

## 🔍 版本同步状态

```
✅ 根目录: 0.56.1
✅ src: 0.56.1
✅ webview-ui: 0.56.1
```

## 📝 注意事项

1. **执行前确保**: 没有未提交的变更
2. **依赖检查**: standard-version 已安装
3. **权限确认**: 有 git 提交和 tag 权限
4. **测试建议**: 先在 feature 分支测试

## 🛠️ 故障排除

### 问题: 版本号未更新

**解决**: 检查 .versionrc 中是否还有 skip 配置

### 问题: changelog 生成失败

**解决**: 确保有 conventional commits 历史

### 问题: git 提交失败

**解决**: 检查 git 配置和权限

## 📚 参考资料

- [standard-version](https://github.com/conventional-changelog/standard-version)
- [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)
- [Conventional Commits](https://www.conventionalcommits.org/)

---

**创建时间**: 2025-12-29
**版本**: 1.0.0
